import {
  AnswerInSessionState,
  Block,
  ContinueChatResponse,
  Group,
  InputBlock,
  Message,
  SessionState,
  SetVariableHistoryItem,
  Variable,
  VariableWithValue,
} from '@mozbot.io/schemas'
import { byId, isDefined } from '@mozbot.io/lib'
import { isInputBlock } from '@mozbot.io/schemas/helpers'
import { executeGroup, parseInput } from './executeGroup'
import { getNextGroup } from './getNextGroup'
import { formatEmail } from './blocks/inputs/email/formatEmail'
import { formatPhoneNumber } from './blocks/inputs/phone/formatPhoneNumber'
import { resumeWebhookExecution } from './blocks/integrations/webhook/resumeWebhookExecution'
import { saveAnswer } from './queries/saveAnswer'
import { parseButtonsReply } from './blocks/inputs/buttons/parseButtonsReply'
import { ParsedReply, Reply } from './types'
import { validateNumber } from './blocks/inputs/number/validateNumber'
import { parseDateReply } from './blocks/inputs/date/parseDateReply'
import { validateRatingReply } from './blocks/inputs/rating/validateRatingReply'
import { parsePictureChoicesReply } from './blocks/inputs/pictureChoice/parsePictureChoicesReply'
import { parseVariables } from '@mozbot.io/variables/parseVariables'
import { updateVariablesInSession } from '@mozbot.io/variables/updateVariablesInSession'
import { startBotFlow } from './startBotFlow'
import { TRPCError } from '@trpc/server'
import { parseNumber } from './blocks/inputs/number/parseNumber'
import { BubbleBlockType } from '@mozbot.io/schemas/features/blocks/bubbles/constants'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'
import { defaultPaymentInputOptions } from '@mozbot.io/schemas/features/blocks/inputs/payment/constants'
import { IntegrationBlockType } from '@mozbot.io/schemas/features/blocks/integrations/constants'
import { LogicBlockType } from '@mozbot.io/schemas/features/blocks/logic/constants'
import { defaultEmailInputOptions } from '@mozbot.io/schemas/features/blocks/inputs/email/constants'
import { defaultChoiceInputOptions } from '@mozbot.io/schemas/features/blocks/inputs/choice/constants'
import { defaultPictureChoiceOptions } from '@mozbot.io/schemas/features/blocks/inputs/pictureChoice/constants'
import { defaultFileInputOptions } from '@mozbot.io/schemas/features/blocks/inputs/file/constants'
import { VisitedEdge } from '@mozbot.io/prisma'
import { getBlockById } from '@mozbot.io/schemas/helpers'
import { ForgedBlock } from '@mozbot.io/forge-repository/types'
import { forgedBlocks } from '@mozbot.io/forge-repository/definitions'
import { resumeChatCompletion } from './blocks/integrations/legacy/openai/resumeChatCompletion'
import { env } from '@mozbot.io/env'
import { isURL } from '@mozbot.io/lib/validators/isURL'
import { isForgedBlockType } from '@mozbot.io/schemas/features/blocks/forged/helpers'
import { resetSessionState } from './resetSessionState'

type Params = {
  version: 1 | 2
  state: SessionState
  startTime?: number
  textBubbleContentFormat: 'richText' | 'markdown'
}
export const continueBotFlow = async (
  reply: Reply,
  { state, version, startTime, textBubbleContentFormat }: Params
): Promise<
  ContinueChatResponse & {
    newSessionState: SessionState
    visitedEdges: VisitedEdge[]
    setVariableHistory: SetVariableHistoryItem[]
  }
> => {
  let firstBubbleWasStreamed = false
  let newSessionState = { ...state }
  const visitedEdges: VisitedEdge[] = []
  const setVariableHistory: SetVariableHistoryItem[] = []

  if (!newSessionState.currentBlockId)
    return startBotFlow({
      state: resetSessionState(newSessionState),
      version,
      textBubbleContentFormat,
    })

  const { block, group, blockIndex } = getBlockById(
    newSessionState.currentBlockId,
    state.mozbotsQueue[0].mozbot.groups
  )

  if (!block)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Group / block not found',
    })

  let variableToUpdate: Variable | undefined

  if (block.type === LogicBlockType.SET_VARIABLE) {
    const existingVariable = state.mozbotsQueue[0].mozbot.variables.find(
      byId(block.options?.variableId)
    )
    if (existingVariable && reply) {
      variableToUpdate = {
        ...existingVariable,
      }
    }
  }
  // Legacy
  else if (
    block.type === IntegrationBlockType.OPEN_AI &&
    block.options?.task === 'Create chat completion'
  ) {
    firstBubbleWasStreamed = true
    if (reply) {
      const result = await resumeChatCompletion(state, {
        options: block.options,
        outgoingEdgeId: block.outgoingEdgeId,
      })(reply.text)
      newSessionState = result.newSessionState
    }
  } else if (reply && block.type === IntegrationBlockType.WEBHOOK) {
    const result = resumeWebhookExecution({
      state,
      block,
      response: JSON.parse(reply.text),
    })
    if (result.newSessionState) newSessionState = result.newSessionState
  } else if (isForgedBlockType(block.type)) {
    if (reply) {
      const options = (block as ForgedBlock).options
      const action = forgedBlocks[block.type].actions.find(
        (a) => a.name === options?.action
      )
      if (action) {
        if (action.run?.stream?.getStreamVariableId) {
          firstBubbleWasStreamed = true
          variableToUpdate = state.mozbotsQueue[0].mozbot.variables.find(
            (v) => v.id === action?.run?.stream?.getStreamVariableId(options)
          )
        }

        if (
          action.run?.web?.displayEmbedBubble?.waitForEvent?.getSaveVariableId
        ) {
          variableToUpdate = state.mozbotsQueue[0].mozbot.variables.find(
            (v) =>
              v.id ===
              action?.run?.web?.displayEmbedBubble?.waitForEvent?.getSaveVariableId?.(
                options
              )
          )
        }
      }
    }
  } else if (
    block.type === BubbleBlockType.EMBED &&
    block.content?.waitForEvent?.saveDataInVariableId
  ) {
    variableToUpdate = state.mozbotsQueue[0].mozbot.variables.find(
      (v) => v.id === block.content?.waitForEvent?.saveDataInVariableId
    )
  }

  if (variableToUpdate) {
    const { newSetVariableHistory, updatedState } = updateVariablesInSession({
      state: newSessionState,
      currentBlockId: block.id,
      newVariables: [
        {
          ...variableToUpdate,
          value: reply?.text ? safeJsonParse(reply?.text) : undefined,
        },
      ],
    })
    newSessionState = updatedState
    setVariableHistory.push(...newSetVariableHistory)
  }

  let formattedReply: string | undefined

  if (isInputBlock(block)) {
    const parsedReplyResult = await parseReply(newSessionState)(reply, block)

    if (parsedReplyResult.status === 'fail')
      return {
        ...(await parseRetryMessage(newSessionState)(
          block,
          textBubbleContentFormat
        )),
        newSessionState,
        visitedEdges: [],
        setVariableHistory: [],
      }

    formattedReply =
      'reply' in parsedReplyResult ? parsedReplyResult.reply : undefined
    newSessionState = await processAndSaveAnswer(
      state,
      block
    )(
      isDefined(formattedReply)
        ? { ...reply, type: 'text', text: formattedReply }
        : undefined
    )
  }

  const groupHasMoreBlocks = blockIndex < group.blocks.length - 1

  const { edgeId: nextEdgeId, isOffDefaultPath } = getOutgoingEdgeId(
    newSessionState
  )(block, formattedReply)

  if (groupHasMoreBlocks && !nextEdgeId) {
    const chatReply = await executeGroup(
      {
        ...group,
        blocks: group.blocks.slice(blockIndex + 1),
      } as Group,
      {
        version,
        state: newSessionState,
        visitedEdges,
        setVariableHistory,
        firstBubbleWasStreamed,
        startTime,
        textBubbleContentFormat,
      }
    )
    return {
      ...chatReply,
      lastMessageNewFormat:
        formattedReply !== reply?.text ? formattedReply : undefined,
    }
  }

  if (!nextEdgeId && state.mozbotsQueue.length === 1)
    return {
      messages: [],
      newSessionState,
      lastMessageNewFormat:
        formattedReply !== reply?.text ? formattedReply : undefined,
      visitedEdges,
      setVariableHistory,
    }

  const nextGroup = await getNextGroup({
    state: newSessionState,
    edgeId: nextEdgeId,
    isOffDefaultPath,
  })

  if (nextGroup.visitedEdge) visitedEdges.push(nextGroup.visitedEdge)

  newSessionState = nextGroup.newSessionState

  if (!nextGroup.group)
    return {
      messages: [],
      newSessionState,
      lastMessageNewFormat:
        formattedReply !== reply ? formattedReply : undefined,
      visitedEdges,
      setVariableHistory,
    }

  const chatReply = await executeGroup(nextGroup.group, {
    version,
    state: newSessionState,
    firstBubbleWasStreamed,
    visitedEdges,
    setVariableHistory,
    startTime,
    textBubbleContentFormat,
  })

  return {
    ...chatReply,
    lastMessageNewFormat:
      formattedReply !== reply?.text ? formattedReply : undefined,
  }
}

const processAndSaveAnswer =
  (state: SessionState, block: InputBlock) =>
  async (reply: Message | undefined): Promise<SessionState> => {
    if (!reply) return state
    return saveAnswerInDb(state, block)(reply)
  }

const saveVariablesValueIfAny =
  (state: SessionState, block: InputBlock) =>
  (reply: Message): SessionState => {
    if (!block.options?.variableId) return state
    const newSessionState = saveAttachmentsVarIfAny({ block, reply, state })
    return saveInputVarIfAny({ block, reply, state: newSessionState })
  }

const saveAttachmentsVarIfAny = ({
  block,
  reply,
  state,
}: {
  block: InputBlock
  reply: Message
  state: SessionState
}): SessionState => {
  if (
    block.type !== InputBlockType.TEXT ||
    !block.options?.attachments?.isEnabled ||
    !block.options?.attachments?.saveVariableId ||
    !reply.attachedFileUrls ||
    reply.attachedFileUrls.length === 0
  )
    return state

  const variable = state.mozbotsQueue[0].mozbot.variables.find(
    (variable) => variable.id === block.options?.attachments?.saveVariableId
  )

  if (!variable) return state

  const { updatedState } = updateVariablesInSession({
    newVariables: [
      {
        id: variable.id,
        name: variable.name,
        value: Array.isArray(variable.value)
          ? variable.value.concat(reply.attachedFileUrls)
          : reply.attachedFileUrls.length === 1
          ? reply.attachedFileUrls[0]
          : reply.attachedFileUrls,
      },
    ],
    currentBlockId: undefined,
    state,
  })
  return updatedState
}

const saveInputVarIfAny = ({
  block,
  reply,
  state,
}: {
  block: InputBlock
  reply: Message
  state: SessionState
}): SessionState => {
  const foundVariable = state.mozbotsQueue[0].mozbot.variables.find(
    (variable) => variable.id === block.options?.variableId
  )
  if (!foundVariable) return state

  const { updatedState } = updateVariablesInSession({
    newVariables: [
      {
        ...foundVariable,
        value:
          Array.isArray(foundVariable.value) && reply.text
            ? foundVariable.value.concat(reply.text)
            : reply.text,
      },
    ],
    currentBlockId: undefined,
    state,
  })

  return updatedState
}

const parseRetryMessage =
  (state: SessionState) =>
  async (
    block: InputBlock,
    textBubbleContentFormat: 'richText' | 'markdown'
  ): Promise<Pick<ContinueChatResponse, 'messages' | 'input'>> => {
    let retryMessage =
      block.options &&
      'retryMessageContent' in block.options &&
      block.options.retryMessageContent
        ? parseVariables(state.mozbotsQueue[0].mozbot.variables)(
            block.options.retryMessageContent
          )
        : parseDefaultRetryMessage(block)
    if (
      block.options &&
      block.type === InputBlockType.CHOICE &&
      'retryMessageContentId' in block.options &&
      block.options.retryMessageContentId
    ) {
      let variable = state.mozbotsQueue[0].mozbot.variables.find(
        (variable) =>
          variable.id === block.options?.retryMessageContentId &&
          isDefined(variable.value)
      ) as VariableWithValue
      if (variable && variable.value) retryMessage = variable.value as string
    }
    return {
      messages: [
        {
          id: block.id,
          type: BubbleBlockType.TEXT,
          content:
            textBubbleContentFormat === 'richText'
              ? {
                  type: 'richText',
                  richText: [{ type: 'p', children: [{ text: retryMessage }] }],
                }
              : {
                  type: 'markdown',
                  markdown: retryMessage,
                },
        },
      ],
      input: await parseInput(state)(block),
    }
  }

const parseDefaultRetryMessage = (block: InputBlock): string => {
  switch (block.type) {
    case InputBlockType.EMAIL:
      return defaultEmailInputOptions.retryMessageContent
    case InputBlockType.PAYMENT:
      return defaultPaymentInputOptions.retryMessageContent
    default:
      return 'Mensaje no válido. Por favor inténtelo de nuevo.'
  }
}

const saveAnswerInDb =
  (state: SessionState, block: InputBlock) =>
  async (reply: Message): Promise<SessionState> => {
    let newSessionState = state
    await saveAnswer({
      answer: {
        blockId: block.id,
        content: reply.text,
        attachedFileUrls: reply.attachedFileUrls,
      },
      state,
    })

    newSessionState = {
      ...saveVariablesValueIfAny(newSessionState, block)(reply),
      previewMetadata: state.mozbotsQueue[0].resultId
        ? newSessionState.previewMetadata
        : {
            ...newSessionState.previewMetadata,
            answers: (newSessionState.previewMetadata?.answers ?? []).concat({
              blockId: block.id,
              content: reply.text,
              attachedFileUrls: reply.attachedFileUrls,
            }),
          },
    }

    const key = block.options?.variableId
      ? newSessionState.mozbotsQueue[0].mozbot.variables.find(
          (variable) => variable.id === block.options?.variableId
        )?.name
      : parseGroupKey(block.id, { state: newSessionState })

    return setNewAnswerInState(newSessionState)({
      key: key ?? block.id,
      value:
        (reply.attachedFileUrls ?? []).length > 0
          ? `${reply.attachedFileUrls!.join(', ')}\n\n${reply.text}`
          : reply.text,
    })
  }

const parseGroupKey = (blockId: string, { state }: { state: SessionState }) => {
  const group = state.mozbotsQueue[0].mozbot.groups.find((group) =>
    group.blocks.find((b) => b.id === blockId)
  )
  if (!group) return

  const inputBlockNumber = group.blocks
    .filter(isInputBlock)
    .findIndex((b) => b.id === blockId)

  return inputBlockNumber > 0
    ? `${group.title} (${inputBlockNumber})`
    : group?.title
}

const setNewAnswerInState =
  (state: SessionState) => (newAnswer: AnswerInSessionState) => {
    const answers = state.mozbotsQueue[0].answers
    const newAnswers = answers
      .filter((answer) => answer.key !== newAnswer.key)
      .concat(newAnswer)

    return {
      ...state,
      progressMetadata: state.progressMetadata
        ? { totalAnswers: state.progressMetadata.totalAnswers + 1 }
        : undefined,
      mozbotsQueue: state.mozbotsQueue.map((mozbot, index) =>
        index === 0
          ? {
              ...mozbot,
              answers: newAnswers,
            }
          : mozbot
      ),
    } satisfies SessionState
  }

const getOutgoingEdgeId =
  (state: Pick<SessionState, 'mozbotsQueue'>) =>
  (
    block: Block,
    reply: string | undefined
  ): { edgeId: string | undefined; isOffDefaultPath: boolean } => {
    const variables = state.mozbotsQueue[0].mozbot.variables
    if (
      block.type === InputBlockType.CHOICE &&
      !(
        block.options?.isMultipleChoice ??
        defaultChoiceInputOptions.isMultipleChoice
      ) &&
      reply
    ) {
      const matchedItem = block.items.find(
        (item) =>
          parseVariables(variables)(item.content).normalize() ===
          reply.normalize()
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
      reply
    ) {
      const matchedItem = block.items.find(
        (item) =>
          parseVariables(variables)(item.title).normalize() ===
          reply.normalize()
      )
      if (matchedItem?.outgoingEdgeId)
        return { edgeId: matchedItem.outgoingEdgeId, isOffDefaultPath: true }
    }
    return { edgeId: block.outgoingEdgeId, isOffDefaultPath: false }
  }

const parseReply =
  (state: SessionState) =>
  async (reply: Reply, block: InputBlock): Promise<ParsedReply> => {
    switch (block.type) {
      case InputBlockType.EMAIL: {
        if (!reply) return { status: 'fail' }
        const formattedEmail = formatEmail(reply.text)
        if (!formattedEmail) return { status: 'fail' }
        return { status: 'success', reply: formattedEmail }
      }
      case InputBlockType.PHONE: {
        if (!reply) return { status: 'fail' }
        const formattedPhone = formatPhoneNumber(
          reply.text,
          block.options?.defaultCountryCode
        )
        if (!formattedPhone) return { status: 'fail' }
        return { status: 'success', reply: formattedPhone }
      }
      case InputBlockType.URL: {
        if (!reply) return { status: 'fail' }
        const isValid = isURL(reply.text, { require_protocol: false })
        if (!isValid) return { status: 'fail' }
        return { status: 'success', reply: reply.text }
      }
      case InputBlockType.CHOICE: {
        if (!reply) return { status: 'fail' }
        return parseButtonsReply(state)(reply.text, block)
      }
      case InputBlockType.NUMBER: {
        if (!reply) return { status: 'fail' }
        const isValid = validateNumber(reply.text, {
          options: block.options,
          variables: state.mozbotsQueue[0].mozbot.variables,
        })
        if (!isValid) return { status: 'fail' }
        return { status: 'success', reply: parseNumber(reply.text) }
      }
      case InputBlockType.DATE: {
        if (!reply) return { status: 'fail' }
        return parseDateReply(reply.text, block)
      }
      case InputBlockType.FILE: {
        if (!reply)
          return block.options?.isRequired ?? defaultFileInputOptions.isRequired
            ? { status: 'fail' }
            : { status: 'skip' }
        const urls = reply.text.split(', ')
        const status = urls.some((url) =>
          isURL(url, { require_tld: env.S3_ENDPOINT !== 'localhost' })
        )
          ? 'success'
          : 'fail'
        if (!block.options?.isMultipleAllowed && urls.length > 1)
          return { status, reply: reply.text.split(',')[0] }
        return { status, reply: reply.text }
      }
      case InputBlockType.PAYMENT: {
        if (!reply) return { status: 'fail' }
        if (reply.text === 'fail') return { status: 'fail' }
        return { status: 'success', reply: reply.text }
      }
      case InputBlockType.RATING: {
        if (!reply) return { status: 'fail' }
        const isValid = validateRatingReply(reply.text, block)
        if (!isValid) return { status: 'fail' }
        return { status: 'success', reply: reply.text }
      }
      case InputBlockType.PICTURE_CHOICE: {
        if (!reply) return { status: 'fail' }
        return parsePictureChoicesReply(state)(reply.text, block)
      }
      case InputBlockType.TEXT: {
        if (!reply) return { status: 'fail' }
        return { status: 'success', reply: reply.text }
      }
    }
  }

export const safeJsonParse = (value: string): unknown => {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}
