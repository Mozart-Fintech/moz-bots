import {
  Answer,
  ContinueChatResponse,
  Edge,
  Group,
  InputBlock,
  MozbotInSession,
  Variable,
} from '@mozbot.io/schemas'
import { SetVariableHistoryItem } from '@mozbot.io/schemas/features/result'
import { isBubbleBlock, isInputBlock } from '@mozbot.io/schemas/helpers'
import { BubbleBlockType } from '@mozbot.io/schemas/features/blocks/bubbles/constants'
import { LogicBlockType } from '@mozbot.io/schemas/features/blocks/logic/constants'
import { createId } from '@mozbot.io/lib/createId'
import { executeCondition } from './executeCondition'
import {
  parseBubbleBlock,
  BubbleBlockWithDefinedContent,
} from '../bot-engine/parseBubbleBlock'
import { defaultChoiceInputOptions } from '@mozbot.io/schemas/features/blocks/inputs/choice/constants'
import { defaultPictureChoiceOptions } from '@mozbot.io/schemas/features/blocks/inputs/pictureChoice/constants'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'
import { parseVariables } from '@mozbot.io/variables/parseVariables'

type TranscriptMessage =
  | {
      role: 'bot' | 'user'
    } & (
      | { type: 'text'; text: string }
      | { type: 'image'; image: string }
      | { type: 'video'; video: string }
      | { type: 'audio'; audio: string }
    )

export const parseTranscriptMessageText = (
  message: TranscriptMessage
): string => {
  switch (message.type) {
    case 'text':
      return message.text
    case 'image':
      return message.image
    case 'video':
      return message.video
    case 'audio':
      return message.audio
  }
}

export const computeResultTranscript = ({
  mozbot,
  answers,
  setVariableHistory,
  visitedEdges,
  stopAtBlockId,
}: {
  mozbot: MozbotInSession
  answers: Pick<Answer, 'blockId' | 'content' | 'attachedFileUrls'>[]
  setVariableHistory: Pick<
    SetVariableHistoryItem,
    'blockId' | 'variableId' | 'value'
  >[]
  visitedEdges: string[]
  stopAtBlockId?: string
}): TranscriptMessage[] => {
  const firstEdgeId = getFirstEdgeId(mozbot)
  if (!firstEdgeId) return []
  const firstEdge = mozbot.edges.find((edge) => edge.id === firstEdgeId)
  if (!firstEdge) return []
  const firstGroup = getNextGroup(mozbot, firstEdgeId)
  if (!firstGroup) return []
  return executeGroup({
    mozbotsQueue: [{ mozbot }],
    nextGroup: firstGroup,
    currentTranscript: [],
    answers: [...answers],
    setVariableHistory: [...setVariableHistory],
    visitedEdges,
    stopAtBlockId,
  })
}

const getFirstEdgeId = (mozbot: MozbotInSession) => {
  if (mozbot.version === '6') return mozbot.events?.[0].outgoingEdgeId
  return mozbot.groups.at(0)?.blocks.at(0)?.outgoingEdgeId
}

const getNextGroup = (
  mozbot: MozbotInSession,
  edgeId: string
): { group: Group; blockIndex?: number } | undefined => {
  const edge = mozbot.edges.find((edge) => edge.id === edgeId)
  if (!edge) return
  const group = mozbot.groups.find((group) => group.id === edge.to.groupId)
  if (!group) return
  const blockIndex = edge.to.blockId
    ? group.blocks.findIndex((block) => block.id === edge.to.blockId)
    : undefined
  return { group, blockIndex }
}

const executeGroup = ({
  currentTranscript,
  mozbotsQueue,
  answers,
  nextGroup,
  setVariableHistory,
  visitedEdges,
  stopAtBlockId,
}: {
  currentTranscript: TranscriptMessage[]
  nextGroup:
    | {
        group: Group
        blockIndex?: number | undefined
      }
    | undefined
  mozbotsQueue: {
    mozbot: MozbotInSession
    resumeEdgeId?: string
  }[]
  answers: Pick<Answer, 'blockId' | 'content' | 'attachedFileUrls'>[]
  setVariableHistory: Pick<
    SetVariableHistoryItem,
    'blockId' | 'variableId' | 'value'
  >[]
  visitedEdges: string[]
  stopAtBlockId?: string
}): TranscriptMessage[] => {
  if (!nextGroup) return currentTranscript
  for (const block of nextGroup?.group.blocks.slice(
    nextGroup.blockIndex ?? 0
  )) {
    if (stopAtBlockId && block.id === stopAtBlockId) return currentTranscript
    while (setVariableHistory.at(0)?.blockId === block.id)
      mozbotsQueue[0].mozbot.variables = applySetVariable(
        setVariableHistory.shift(),
        mozbotsQueue[0].mozbot
      )
    let nextEdgeId = block.outgoingEdgeId
    if (isBubbleBlock(block)) {
      if (!block.content) continue
      const parsedBubbleBlock = parseBubbleBlock(
        block as BubbleBlockWithDefinedContent,
        {
          version: 2,
          variables: mozbotsQueue[0].mozbot.variables,
          mozbotVersion: mozbotsQueue[0].mozbot.version,
          textBubbleContentFormat: 'markdown',
        }
      )
      const newMessage =
        convertChatMessageToTranscriptMessage(parsedBubbleBlock)
      if (newMessage) currentTranscript.push(newMessage)
    } else if (isInputBlock(block)) {
      const answer = answers.shift()
      if (!answer) break
      if (block.options?.variableId) {
        const replyVariable = mozbotsQueue[0].mozbot.variables.find(
          (variable) => variable.id === block.options?.variableId
        )
        if (replyVariable) {
          mozbotsQueue[0].mozbot.variables =
            mozbotsQueue[0].mozbot.variables.map((v) =>
              v.id === replyVariable.id ? { ...v, value: answer.content } : v
            )
        }
      }
      if (
        block.type === InputBlockType.TEXT &&
        block.options?.attachments?.isEnabled &&
        block.options?.attachments?.saveVariableId &&
        answer.attachedFileUrls &&
        answer.attachedFileUrls?.length > 0
      ) {
        const variable = mozbotsQueue[0].mozbot.variables.find(
          (variable) =>
            variable.id === block.options?.attachments?.saveVariableId
        )
        if (variable) {
          mozbotsQueue[0].mozbot.variables =
            mozbotsQueue[0].mozbot.variables.map((v) =>
              v.id === variable.id
                ? {
                    ...v,
                    value: Array.isArray(variable.value)
                      ? variable.value.concat(answer.attachedFileUrls!)
                      : answer.attachedFileUrls!.length === 1
                      ? answer.attachedFileUrls![0]
                      : answer.attachedFileUrls,
                  }
                : v
            )
        }
      }
      currentTranscript.push({
        role: 'user',
        type: 'text',
        text:
          (answer.attachedFileUrls?.length ?? 0) > 0
            ? `${answer.attachedFileUrls?.join(', ')}\n\n${answer.content}`
            : answer.content,
      })
      const outgoingEdge = getOutgoingEdgeId({
        block,
        answer: answer.content,
        variables: mozbotsQueue[0].mozbot.variables,
      })
      if (outgoingEdge.isOffDefaultPath) visitedEdges.shift()
      nextEdgeId = outgoingEdge.edgeId
    } else if (block.type === LogicBlockType.CONDITION) {
      const passedCondition = block.items.find(
        (item) =>
          item.content &&
          executeCondition({
            variables: mozbotsQueue[0].mozbot.variables,
            condition: item.content,
          })
      )
      if (passedCondition) {
        visitedEdges.shift()
        nextEdgeId = passedCondition.outgoingEdgeId
      }
    } else if (block.type === LogicBlockType.AB_TEST) {
      nextEdgeId = visitedEdges.shift() ?? nextEdgeId
    } else if (block.type === LogicBlockType.JUMP) {
      if (!block.options?.groupId) continue
      const groupToJumpTo = mozbotsQueue[0].mozbot.groups.find(
        (group) => group.id === block.options?.groupId
      )
      const blockToJumpTo =
        groupToJumpTo?.blocks.find((b) => b.id === block.options?.blockId) ??
        groupToJumpTo?.blocks[0]

      if (!blockToJumpTo) continue

      const portalEdge = {
        id: createId(),
        from: { blockId: '', groupId: '' },
        to: { groupId: block.options.groupId, blockId: blockToJumpTo.id },
      }
      mozbotsQueue[0].mozbot.edges.push(portalEdge)
      visitedEdges.shift()
      nextEdgeId = portalEdge.id
    } else if (block.type === LogicBlockType.MOZBOT_LINK) {
      const isLinkingSameMozbot =
        block.options &&
        (block.options.mozbotId === 'current' ||
          block.options.mozbotId === mozbotsQueue[0].mozbot.id)

      const linkedGroup = mozbotsQueue[0].mozbot.groups.find(
        (g) => g.id === block.options?.groupId
      )
      if (!isLinkingSameMozbot || !linkedGroup) continue
      let resumeEdge: Edge | undefined
      if (!block.outgoingEdgeId) {
        const currentBlockIndex = nextGroup.group.blocks.findIndex(
          (b) => b.id === block.id
        )
        const nextBlockInGroup =
          currentBlockIndex === -1
            ? undefined
            : nextGroup.group.blocks.at(currentBlockIndex + 1)
        if (nextBlockInGroup)
          resumeEdge = {
            id: createId(),
            from: {
              blockId: '',
            },
            to: {
              groupId: nextGroup.group.id,
              blockId: nextBlockInGroup.id,
            },
          }
      }
      return executeGroup({
        mozbotsQueue: [
          {
            mozbot: mozbotsQueue[0].mozbot,
            resumeEdgeId: resumeEdge ? resumeEdge.id : block.outgoingEdgeId,
          },
          {
            mozbot: resumeEdge
              ? {
                  ...mozbotsQueue[0].mozbot,
                  edges: mozbotsQueue[0].mozbot.edges.concat([resumeEdge]),
                }
              : mozbotsQueue[0].mozbot,
          },
        ],
        answers,
        setVariableHistory,
        currentTranscript,
        nextGroup: {
          group: linkedGroup,
        },
        visitedEdges,
        stopAtBlockId,
      })
    }
    if (nextEdgeId) {
      const nextGroup = getNextGroup(mozbotsQueue[0].mozbot, nextEdgeId)
      if (nextGroup) {
        return executeGroup({
          mozbotsQueue,
          answers,
          setVariableHistory,
          currentTranscript,
          nextGroup,
          visitedEdges,
          stopAtBlockId,
        })
      }
    }
  }
  if (mozbotsQueue.length > 1 && mozbotsQueue[0].resumeEdgeId) {
    return executeGroup({
      mozbotsQueue: mozbotsQueue.slice(1),
      answers,
      setVariableHistory,
      currentTranscript,
      nextGroup: getNextGroup(
        mozbotsQueue[1].mozbot,
        mozbotsQueue[0].resumeEdgeId
      ),
      visitedEdges: visitedEdges.slice(1),
      stopAtBlockId,
    })
  }
  return currentTranscript
}

const applySetVariable = (
  setVariable:
    | Pick<SetVariableHistoryItem, 'blockId' | 'variableId' | 'value'>
    | undefined,
  mozbot: MozbotInSession
): Variable[] => {
  if (!setVariable) return mozbot.variables
  const variable = mozbot.variables.find(
    (variable) => variable.id === setVariable.variableId
  )
  if (!variable) return mozbot.variables
  return mozbot.variables.map((v) =>
    v.id === variable.id ? { ...v, value: setVariable.value } : v
  )
}

const convertChatMessageToTranscriptMessage = (
  chatMessage: ContinueChatResponse['messages'][0]
): TranscriptMessage | null => {
  switch (chatMessage.type) {
    case BubbleBlockType.TEXT: {
      if (chatMessage.content.type === 'richText') return null
      return {
        role: 'bot',
        type: 'text',
        text: chatMessage.content.markdown,
      }
    }
    case BubbleBlockType.IMAGE: {
      if (!chatMessage.content.url) return null
      return {
        role: 'bot',
        type: 'image',
        image: chatMessage.content.url,
      }
    }
    case BubbleBlockType.VIDEO: {
      if (!chatMessage.content.url) return null
      return {
        role: 'bot',
        type: 'video',
        video: chatMessage.content.url,
      }
    }
    case BubbleBlockType.AUDIO: {
      if (!chatMessage.content.url) return null
      return {
        role: 'bot',
        type: 'audio',
        audio: chatMessage.content.url,
      }
    }
    case 'custom-embed':
    case BubbleBlockType.EMBED: {
      return null
    }
  }
}

const getOutgoingEdgeId = ({
  block,
  answer,
  variables,
}: {
  block: InputBlock
  answer: string | undefined
  variables: Variable[]
}): { edgeId: string | undefined; isOffDefaultPath: boolean } => {
  if (
    block.type === InputBlockType.CHOICE &&
    !(
      block.options?.isMultipleChoice ??
      defaultChoiceInputOptions.isMultipleChoice
    ) &&
    answer
  ) {
    const matchedItem = block.items.find(
      (item) =>
        parseVariables(variables)(item.content).normalize() ===
        answer.normalize()
    )
    if (matchedItem?.outgoingEdgeId)
      return { edgeId: matchedItem.outgoingEdgeId, isOffDefaultPath: true }
  }
  if (
    block.type === InputBlockType.PICTURE_CHOICE &&
    !(
      block.options?.isMultipleChoice ??
      defaultPictureChoiceOptions.isMultipleChoice
    ) &&
    answer
  ) {
    const matchedItem = block.items.find(
      (item) =>
        parseVariables(variables)(item.title).normalize() === answer.normalize()
    )
    if (matchedItem?.outgoingEdgeId)
      return { edgeId: matchedItem.outgoingEdgeId, isOffDefaultPath: true }
  }
  return { edgeId: block.outgoingEdgeId, isOffDefaultPath: false }
}
