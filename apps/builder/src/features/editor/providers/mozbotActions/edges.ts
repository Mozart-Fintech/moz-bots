import {
  Mozbot,
  Edge,
  BlockWithItems,
  BlockIndices,
  ItemIndices,
  Block,
  MozbotV6,
} from '@mozbot.io/schemas'
import { SetMozbot } from '../MozbotProvider'
import { Draft, produce } from 'immer'
import { byId, isDefined } from '@mozbot.io/lib'
import { blockHasItems } from '@mozbot.io/schemas/helpers'
import { createId } from '@paralleldrive/cuid2'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'

export type EdgesActions = {
  createEdge: (edge: Omit<Edge, 'id'>) => void
  updateEdge: (edgeIndex: number, updates: Partial<Omit<Edge, 'id'>>) => void
  deleteEdge: (edgeId: string) => void
}

export const edgesAction = (setMozbot: SetMozbot): EdgesActions => ({
  createEdge: (edge: Omit<Edge, 'id'>) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        const newEdge = {
          ...edge,
          id: createId(),
        }
        removeExistingEdge(mozbot, edge)
        mozbot.edges.push(newEdge)
        if ('eventId' in edge.from) {
          const eventIndex = mozbot.events.findIndex(byId(edge.from.eventId))
          addEdgeIdToEvent(mozbot, newEdge.id, {
            eventIndex,
          })
        } else {
          const groupIndex = mozbot.groups.findIndex((g) =>
            g.blocks.some(
              (b) => 'blockId' in edge.from && b.id === edge.from.blockId
            )
          )
          const blockIndex = mozbot.groups[groupIndex].blocks.findIndex(
            byId(edge.from.blockId)
          )
          const itemIndex = edge.from.itemId
            ? (
                mozbot.groups[groupIndex].blocks[blockIndex] as
                  | BlockWithItems
                  | undefined
              )?.items.findIndex(byId(edge.from.itemId))
            : null

          isDefined(itemIndex) && itemIndex !== -1
            ? addEdgeIdToItem(mozbot, newEdge.id, {
                groupIndex,
                blockIndex,
                itemIndex,
              })
            : addEdgeIdToBlock(mozbot, newEdge.id, {
                groupIndex,
                blockIndex,
              })

          const block = mozbot.groups[groupIndex].blocks[blockIndex]
          if (isDefined(itemIndex) && isDefined(block.outgoingEdgeId)) {
            const areAllItemsConnected = (block as BlockWithItems).items.every(
              (item) => isDefined(item.outgoingEdgeId)
            )
            if (
              areAllItemsConnected &&
              (block.type === InputBlockType.CHOICE ||
                block.type === InputBlockType.PICTURE_CHOICE)
            ) {
              deleteEdgeDraft({
                mozbot,
                edgeId: block.outgoingEdgeId,
                groupIndex,
              })
            }
          }
        }
      })
    ),
  updateEdge: (edgeIndex: number, updates: Partial<Omit<Edge, 'id'>>) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        const currentEdge = mozbot.edges[edgeIndex]
        mozbot.edges[edgeIndex] = {
          ...currentEdge,
          ...updates,
        }
      })
    ),
  deleteEdge: (edgeId: string) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        deleteEdgeDraft({ mozbot, edgeId })
      })
    ),
})

const addEdgeIdToEvent = (
  mozbot: Draft<MozbotV6>,
  edgeId: string,
  { eventIndex }: { eventIndex: number }
) => (mozbot.events[eventIndex].outgoingEdgeId = edgeId)

const addEdgeIdToBlock = (
  mozbot: Draft<Mozbot>,
  edgeId: string,
  { groupIndex, blockIndex }: BlockIndices
) => {
  mozbot.groups[groupIndex].blocks[blockIndex].outgoingEdgeId = edgeId
}

const addEdgeIdToItem = (
  mozbot: Draft<Mozbot>,
  edgeId: string,
  { groupIndex, blockIndex, itemIndex }: ItemIndices
) =>
  ((mozbot.groups[groupIndex].blocks[blockIndex] as BlockWithItems).items[
    itemIndex
  ].outgoingEdgeId = edgeId)

export const deleteEdgeDraft = ({
  mozbot,
  edgeId,
  groupIndex,
}: {
  mozbot: Draft<MozbotV6>
  edgeId: string
  groupIndex?: number
}) => {
  const edgeIndex = mozbot.edges.findIndex(byId(edgeId))
  if (edgeIndex === -1) return
  deleteOutgoingEdgeIdProps({ mozbot, edgeId, groupIndex })
  mozbot.edges.splice(edgeIndex, 1)
}

const deleteOutgoingEdgeIdProps = ({
  mozbot,
  edgeId,
  groupIndex,
}: {
  mozbot: Draft<MozbotV6>
  edgeId: string
  groupIndex?: number
}) => {
  const edge = mozbot.edges.find(byId(edgeId))
  if (!edge) return
  if ('eventId' in edge.from) {
    const eventIndex = mozbot.events.findIndex(byId(edge.from.eventId))
    if (eventIndex === -1) return
    mozbot.events[eventIndex].outgoingEdgeId = undefined
    return
  }
  const fromGroupIndex =
    groupIndex ??
    mozbot.groups.findIndex(
      (g) =>
        edge.to.groupId === g.id ||
        g.blocks.some(
          (b) =>
            'blockId' in edge.from &&
            (b.id === edge.from.blockId || b.id === edge.to.blockId)
        )
    )
  const fromBlockIndex = mozbot.groups[fromGroupIndex].blocks.findIndex(
    byId(edge.from.blockId)
  )
  const block = mozbot.groups[fromGroupIndex].blocks[fromBlockIndex] as
    | Block
    | undefined
  if (!block) return
  const fromItemIndex =
    edge.from.itemId && blockHasItems(block)
      ? block.items?.findIndex(byId(edge.from.itemId))
      : -1
  if (fromItemIndex !== -1) {
    ;(
      mozbot.groups[fromGroupIndex].blocks[fromBlockIndex] as BlockWithItems
    ).items[fromItemIndex ?? 0].outgoingEdgeId = undefined
  } else if (fromBlockIndex !== -1)
    mozbot.groups[fromGroupIndex].blocks[fromBlockIndex].outgoingEdgeId =
      undefined
}

export const deleteConnectedEdgesDraft = (
  mozbot: Draft<MozbotV6>,
  deletedNodeId: string
) => {
  const edgesToDelete = mozbot.edges.filter((edge) => {
    if ('eventId' in edge.from)
      return [edge.from.eventId, edge.to.groupId, edge.to.blockId].includes(
        deletedNodeId
      )

    return [
      edge.from.blockId,
      edge.from.itemId,
      edge.to.groupId,
      edge.to.blockId,
    ].includes(deletedNodeId)
  })

  edgesToDelete.forEach((edge) => deleteEdgeDraft({ mozbot, edgeId: edge.id }))
}

const removeExistingEdge = (mozbot: Draft<Mozbot>, edge: Omit<Edge, 'id'>) => {
  mozbot.edges = mozbot.edges.filter((e) => {
    if ('eventId' in edge.from) {
      if ('eventId' in e.from) return e.from.eventId !== edge.from.eventId
      return true
    }

    if ('eventId' in e.from) return true

    return edge.from.itemId
      ? e.from && e.from.itemId !== edge.from.itemId
      : isDefined(e.from.itemId) || e.from.blockId !== edge.from.blockId
  })
}
