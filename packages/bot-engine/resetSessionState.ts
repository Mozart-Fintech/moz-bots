import { SessionState } from '@mozbot.io/schemas/features/chat/sessionState'

export const resetSessionState = (state: SessionState): SessionState => ({
  ...state,
  currentSetVariableHistoryIndex: undefined,
  currentVisitedEdgeIndex: undefined,
  previewMetadata: undefined,
  progressMetadata: undefined,
  mozbotsQueue: state.mozbotsQueue.map((queueItem) => ({
    ...queueItem,
    answers: [],
    mozbot: {
      ...queueItem.mozbot,
      variables: queueItem.mozbot.variables.map((variable) => ({
        ...variable,
        value: undefined,
      })),
    },
  })),
})
