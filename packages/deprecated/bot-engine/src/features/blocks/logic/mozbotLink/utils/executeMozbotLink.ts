import { LinkedMozbot } from '@/providers/MozbotProvider'
import { EdgeId, LogicState } from '@/types'
import { MozbotLinkBlock, Edge, PublicMozbot } from '@mozbot.io/schemas'
import { fetchAndInjectMozbot } from '../queries/fetchAndInjectMozbotQuery'

export const executeMozbotLink = async (
  block: MozbotLinkBlock,
  context: LogicState
): Promise<{
  nextEdgeId?: EdgeId
  linkedMozbot?: PublicMozbot | LinkedMozbot
}> => {
  const {
    mozbot,
    linkedMozbots,
    onNewLog,
    createEdge,
    setCurrentmozbotId,
    pushEdgeIdInLinkedMozbotQueue,
    pushParentmozbotId,
    currentmozbotId,
  } = context
  const linkedMozbot = (
    block.options?.mozbotId === 'current'
      ? mozbot
      : [mozbot, ...linkedMozbots].find((mozbot) =>
          'mozbotId' in mozbot
            ? mozbot.mozbotId === block.options?.mozbotId
            : mozbot.id === block.options?.mozbotId
        ) ?? (await fetchAndInjectMozbot(block, context))
  ) as PublicMozbot | LinkedMozbot | undefined
  if (!linkedMozbot) {
    onNewLog({
      status: 'error',
      description: 'Failed to link mozbot',
      details: '',
    })
    return { nextEdgeId: block.outgoingEdgeId }
  }
  if (block.outgoingEdgeId)
    pushEdgeIdInLinkedMozbotQueue({
      edgeId: block.outgoingEdgeId,
      mozbotId: currentmozbotId,
    })
  pushParentmozbotId(currentmozbotId)
  setCurrentmozbotId(
    'mozbotId' in linkedMozbot ? linkedMozbot.mozbotId : linkedMozbot.id
  )
  const nextGroupId =
    block.options?.groupId ??
    linkedMozbot.groups.find((b) => b.blocks.some((s) => s.type === 'start'))
      ?.id
  if (!nextGroupId) return { nextEdgeId: block.outgoingEdgeId }
  const newEdge: Edge = {
    id: (Math.random() * 1000).toString(),
    from: { blockId: '' },
    to: {
      groupId: nextGroupId,
    },
  }
  createEdge(newEdge)
  return {
    nextEdgeId: newEdge.id,
    linkedMozbot: {
      ...linkedMozbot,
      edges: [...linkedMozbot.edges, newEdge],
    },
  }
}
