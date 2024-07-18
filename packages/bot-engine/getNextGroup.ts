import { byId, isDefined, isNotDefined } from '@mozbot.io/lib'
import { Group, SessionState, VariableWithValue } from '@mozbot.io/schemas'
import { upsertResult } from './queries/upsertResult'
import { VisitedEdge } from '@mozbot.io/prisma'

export type NextGroup = {
  group?: Group
  newSessionState: SessionState
  visitedEdge?: VisitedEdge
}

export const getNextGroup = async ({
  state,
  edgeId,
  isOffDefaultPath,
}: {
  state: SessionState
  edgeId?: string
  isOffDefaultPath: boolean
}): Promise<NextGroup> => {
  const nextEdge = state.mozbotsQueue[0].mozbot.edges.find(byId(edgeId))
  if (!nextEdge) {
    if (state.mozbotsQueue.length > 1) {
      const nextEdgeId = state.mozbotsQueue[0].edgeIdToTriggerWhenDone
      const isMergingWithParent = state.mozbotsQueue[0].isMergingWithParent
      const currentResultId = state.mozbotsQueue[0].resultId
      if (!isMergingWithParent && currentResultId)
        await upsertResult({
          resultId: currentResultId,
          mozbot: state.mozbotsQueue[0].mozbot,
          isCompleted: true,
          hasStarted: state.mozbotsQueue[0].answers.length > 0,
        })
      let newSessionState = {
        ...state,
        mozbotsQueue: [
          {
            ...state.mozbotsQueue[1],
            mozbot: isMergingWithParent
              ? {
                  ...state.mozbotsQueue[1].mozbot,
                  variables: state.mozbotsQueue[1].mozbot.variables
                    .map((variable) => ({
                      ...variable,
                      value:
                        state.mozbotsQueue[0].mozbot.variables.find(
                          (v) => v.name === variable.name
                        )?.value ?? variable.value,
                    }))
                    .concat(
                      state.mozbotsQueue[0].mozbot.variables.filter(
                        (variable) =>
                          isDefined(variable.value) &&
                          isNotDefined(
                            state.mozbotsQueue[1].mozbot.variables.find(
                              (v) => v.name === variable.name
                            )
                          )
                      ) as VariableWithValue[]
                    ),
                }
              : state.mozbotsQueue[1].mozbot,
            answers: isMergingWithParent
              ? [
                  ...state.mozbotsQueue[1].answers.filter(
                    (incomingAnswer) =>
                      !state.mozbotsQueue[0].answers.find(
                        (currentAnswer) =>
                          currentAnswer.key === incomingAnswer.key
                      )
                  ),
                  ...state.mozbotsQueue[0].answers,
                ]
              : state.mozbotsQueue[1].answers,
          },
          ...state.mozbotsQueue.slice(2),
        ],
      } satisfies SessionState
      if (state.progressMetadata)
        newSessionState.progressMetadata = {
          ...state.progressMetadata,
          totalAnswers:
            state.progressMetadata.totalAnswers +
            state.mozbotsQueue[0].answers.length,
        }
      const nextGroup = await getNextGroup({
        state: newSessionState,
        edgeId: nextEdgeId,
        isOffDefaultPath,
      })
      newSessionState = nextGroup.newSessionState
      if (!nextGroup)
        return {
          newSessionState,
        }
      return {
        ...nextGroup,
        newSessionState,
      }
    }
    return {
      newSessionState: state,
    }
  }
  const nextGroup = state.mozbotsQueue[0].mozbot.groups.find(
    byId(nextEdge.to.groupId)
  )
  if (!nextGroup)
    return {
      newSessionState: state,
    }
  const startBlockIndex = nextEdge.to.blockId
    ? nextGroup.blocks.findIndex(byId(nextEdge.to.blockId))
    : 0
  const currentVisitedEdgeIndex = isOffDefaultPath
    ? (state.currentVisitedEdgeIndex ?? -1) + 1
    : state.currentVisitedEdgeIndex
  const resultId = state.mozbotsQueue[0].resultId
  return {
    group: {
      ...nextGroup,
      blocks: nextGroup.blocks.slice(startBlockIndex),
    } as Group,
    newSessionState: {
      ...state,
      currentVisitedEdgeIndex,
      previewMetadata:
        resultId || !isOffDefaultPath
          ? state.previewMetadata
          : {
              ...state.previewMetadata,
              visitedEdges: (state.previewMetadata?.visitedEdges ?? []).concat(
                nextEdge.id
              ),
            },
    },
    visitedEdge:
      resultId && isOffDefaultPath && !nextEdge.id.startsWith('virtual-')
        ? {
            index: currentVisitedEdgeIndex as number,
            edgeId: nextEdge.id,
            resultId,
          }
        : undefined,
  }
}
