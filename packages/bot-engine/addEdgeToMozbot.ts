import { createId } from '@paralleldrive/cuid2'
import { SessionState, Edge } from '@mozbot.io/schemas'

export const addEdgeToMozbot = (
  state: SessionState,
  edge: Edge
): SessionState => ({
  ...state,
  mozbotsQueue: state.mozbotsQueue.map((mozbot, index) =>
    index === 0
      ? {
          ...mozbot,
          mozbot: {
            ...mozbot.mozbot,
            edges: [...mozbot.mozbot.edges, edge],
          },
        }
      : mozbot
  ),
})

export const createPortalEdge = ({ to }: Pick<Edge, 'to'>) => ({
  id: 'virtual-' + createId(),
  from: { blockId: '', groupId: '' },
  to,
})
