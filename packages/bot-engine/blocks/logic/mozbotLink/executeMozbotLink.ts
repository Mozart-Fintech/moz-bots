import { addEdgeToMozbot, createPortalEdge } from '../../../addEdgeToMozbot'
import {
  MozbotLinkBlock,
  SessionState,
  Variable,
  ChatLog,
  Edge,
  mozbotInSessionStateSchema,
  MozbotInSession,
} from '@mozbot.io/schemas'
import { ExecuteLogicResponse } from '../../../types'
import { createId } from '@paralleldrive/cuid2'
import { isNotDefined, byId } from '@mozbot.io/lib/utils'
import { createResultIfNotExist } from '../../../queries/createResultIfNotExist'
import prisma from '@mozbot.io/lib/prisma'
import { defaultMozbotLinkOptions } from '@mozbot.io/schemas/features/blocks/logic/mozbotLink/constants'

export const executeMozbotLink = async (
  state: SessionState,
  block: MozbotLinkBlock
): Promise<ExecuteLogicResponse> => {
  const logs: ChatLog[] = []
  const mozbotId = block.options?.mozbotId
  if (!mozbotId) {
    logs.push({
      status: 'error',
      description: `Failed to link mozbot`,
      details: `Mozbot ID is not specified`,
    })
    return { outgoingEdgeId: block.outgoingEdgeId, logs }
  }
  const isLinkingSameMozbot =
    mozbotId === 'current' || mozbotId === state.mozbotsQueue[0].mozbot.id
  let newSessionState = state
  let nextGroupId: string | undefined
  if (isLinkingSameMozbot) {
    newSessionState = await addSameMozbotToState({ state, block })
    nextGroupId = block.options?.groupId
  } else {
    const linkedMozbot = await fetchMozbot(state, mozbotId)
    if (!linkedMozbot) {
      logs.push({
        status: 'error',
        description: `Failed to link mozbot`,
        details: `Mozbot with ID ${block.options?.mozbotId} not found`,
      })
      return { outgoingEdgeId: block.outgoingEdgeId, logs }
    }
    newSessionState = await addLinkedMozbotToState(state, block, linkedMozbot)
    nextGroupId = getNextGroupId(block.options?.groupId, linkedMozbot)
  }

  if (!nextGroupId) {
    logs.push({
      status: 'error',
      description: `Failed to link mozbot`,
      details: `Group with ID "${block.options?.groupId}" not found`,
    })
    return { outgoingEdgeId: block.outgoingEdgeId, logs }
  }

  const portalEdge = createPortalEdge({ to: { groupId: nextGroupId } })

  newSessionState = addEdgeToMozbot(newSessionState, portalEdge)

  return {
    outgoingEdgeId: portalEdge.id,
    newSessionState,
  }
}

const addSameMozbotToState = async ({
  state,
  block,
}: {
  state: SessionState
  block: MozbotLinkBlock
}) => {
  const currentMozbotInQueue = state.mozbotsQueue[0]

  const resumeEdge = createResumeEdgeIfNecessary(state, block)

  const currentMozbotWithResumeEdge = resumeEdge
    ? {
        ...currentMozbotInQueue,
        mozbot: {
          ...currentMozbotInQueue.mozbot,
          edges: [...currentMozbotInQueue.mozbot.edges, resumeEdge],
        },
      }
    : currentMozbotInQueue

  return {
    ...state,
    mozbotsQueue: [
      {
        mozbot: {
          ...currentMozbotInQueue.mozbot,
        },
        resultId: currentMozbotInQueue.resultId,
        edgeIdToTriggerWhenDone: block.outgoingEdgeId ?? resumeEdge?.id,
        answers: currentMozbotInQueue.answers,
        isMergingWithParent: true,
      },
      currentMozbotWithResumeEdge,
      ...state.mozbotsQueue.slice(1),
    ],
  }
}

const addLinkedMozbotToState = async (
  state: SessionState,
  block: MozbotLinkBlock,
  linkedMozbot: MozbotInSession
): Promise<SessionState> => {
  const currentMozbotInQueue = state.mozbotsQueue[0]

  const resumeEdge = createResumeEdgeIfNecessary(state, block)

  const currentMozbotWithResumeEdge = resumeEdge
    ? {
        ...currentMozbotInQueue,
        mozbot: {
          ...currentMozbotInQueue.mozbot,
          edges: [...currentMozbotInQueue.mozbot.edges, resumeEdge],
        },
      }
    : currentMozbotInQueue

  const shouldMergeResults =
    currentMozbotInQueue.mozbot.version === '6'
      ? block.options?.mergeResults ?? defaultMozbotLinkOptions.mergeResults
      : block.options?.mergeResults !== false

  if (
    currentMozbotInQueue.resultId &&
    currentMozbotInQueue.answers.length === 0
  ) {
    await createResultIfNotExist({
      resultId: currentMozbotInQueue.resultId,
      mozbot: currentMozbotInQueue.mozbot,
      hasStarted: false,
      isCompleted: false,
    })
  }

  const isPreview = isNotDefined(currentMozbotInQueue.resultId)
  return {
    ...state,
    mozbotsQueue: [
      {
        mozbot: {
          ...linkedMozbot,
          variables: fillVariablesWithExistingValues(
            linkedMozbot.variables,
            state.mozbotsQueue
          ),
        },
        resultId: isPreview
          ? undefined
          : shouldMergeResults
          ? currentMozbotInQueue.resultId
          : createId(),
        edgeIdToTriggerWhenDone: block.outgoingEdgeId ?? resumeEdge?.id,
        answers: shouldMergeResults ? currentMozbotInQueue.answers : [],
        isMergingWithParent: shouldMergeResults,
      },
      currentMozbotWithResumeEdge,
      ...state.mozbotsQueue.slice(1),
    ],
  }
}

const createResumeEdgeIfNecessary = (
  state: SessionState,
  block: MozbotLinkBlock
): Edge | undefined => {
  const currentMozbotInQueue = state.mozbotsQueue[0]
  const blockId = block.id
  if (block.outgoingEdgeId) return
  const currentGroup = currentMozbotInQueue.mozbot.groups.find((group) =>
    group.blocks.some((block) => block.id === blockId)
  )
  if (!currentGroup) return
  const currentBlockIndex = currentGroup.blocks.findIndex(
    (block) => block.id === blockId
  )
  const nextBlockInGroup =
    currentBlockIndex === -1
      ? undefined
      : currentGroup.blocks[currentBlockIndex + 1]
  if (!nextBlockInGroup) return
  return {
    id: createId(),
    from: {
      blockId: '',
    },
    to: {
      groupId: currentGroup.id,
      blockId: nextBlockInGroup.id,
    },
  }
}

const fillVariablesWithExistingValues = (
  emptyVariables: Variable[],
  mozbotsQueue: SessionState['mozbotsQueue']
): Variable[] =>
  emptyVariables.map((emptyVariable) => {
    let matchedVariable
    for (const mozbotInQueue of mozbotsQueue) {
      matchedVariable = mozbotInQueue.mozbot.variables.find(
        (v) => v.name === emptyVariable.name
      )
      if (matchedVariable) break
    }
    return {
      ...emptyVariable,
      value: matchedVariable?.value,
    }
  })

const fetchMozbot = async (state: SessionState, mozbotId: string) => {
  const { resultId } = state.mozbotsQueue[0]
  const isPreview = !resultId
  if (isPreview) {
    const mozbot = await prisma.mozbot.findUnique({
      where: { id: mozbotId },
      select: {
        version: true,
        id: true,
        edges: true,
        groups: true,
        variables: true,
        events: true,
      },
    })
    return mozbotInSessionStateSchema.parse(mozbot)
  }
  const mozbot = await prisma.publicMozbot.findUnique({
    where: { mozbotId },
    select: {
      version: true,
      id: true,
      edges: true,
      groups: true,
      variables: true,
      events: true,
    },
  })
  if (!mozbot) return null
  return mozbotInSessionStateSchema.parse({
    ...mozbot,
    id: mozbotId,
  })
}

const getNextGroupId = (
  groupId: string | undefined,
  mozbot: MozbotInSession
) => {
  if (groupId) return groupId
  if (mozbot.version === '6') {
    const startEdge = mozbot.edges.find(byId(mozbot.events[0].outgoingEdgeId))
    return startEdge?.to.groupId
  }
  return mozbot.groups.find((group) =>
    group.blocks.some((block) => block.type === 'start')
  )?.id
}
