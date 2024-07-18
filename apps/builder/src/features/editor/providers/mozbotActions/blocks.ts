import {
  Block,
  Mozbot,
  BlockIndices,
  HttpRequest,
  BlockV6,
  MozbotV6,
} from '@mozbot.io/schemas'
import { SetMozbot } from '../MozbotProvider'
import { produce, Draft } from 'immer'
import { deleteConnectedEdgesDraft, deleteEdgeDraft } from './edges'
import { createId } from '@paralleldrive/cuid2'
import { byId } from '@mozbot.io/lib'
import { blockHasItems } from '@mozbot.io/schemas/helpers'
import { duplicateItemDraft } from './items'
import { parseNewBlock } from '@/features/mozbot/helpers/parseNewBlock'

export type BlocksActions = {
  createBlock: (
    block: BlockV6 | BlockV6['type'],
    indices: BlockIndices
  ) => string | undefined
  updateBlock: (
    indices: BlockIndices,
    updates: Partial<Omit<BlockV6, 'id' | 'type'>>
  ) => void
  duplicateBlock: (indices: BlockIndices) => void
  detachBlockFromGroup: (indices: BlockIndices) => void
  deleteBlock: (indices: BlockIndices) => void
}

export type WebhookCallBacks = {
  onWebhookBlockCreated: (data: Partial<HttpRequest>) => void
  onWebhookBlockDuplicated: (
    existingWebhookId: string,
    newWebhookId: string
  ) => void
}

export const blocksAction = (setMozbot: SetMozbot): BlocksActions => ({
  createBlock: (block: BlockV6 | BlockV6['type'], indices: BlockIndices) => {
    let blockId
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        blockId = createBlockDraft(mozbot, block, indices)
      })
    )
    return blockId
  },
  updateBlock: (
    { groupIndex, blockIndex }: BlockIndices,
    updates: Partial<Omit<Block, 'id' | 'type'>>
  ) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        if (!mozbot.groups[groupIndex]?.blocks[blockIndex]) return
        const block = mozbot.groups[groupIndex].blocks[blockIndex]
        mozbot.groups[groupIndex].blocks[blockIndex] = { ...block, ...updates }
      })
    ),
  duplicateBlock: ({ groupIndex, blockIndex }: BlockIndices) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        const block = { ...mozbot.groups[groupIndex].blocks[blockIndex] }
        const blocks = mozbot.groups[groupIndex].blocks
        if (blockIndex === blocks.length - 1 && block.outgoingEdgeId)
          deleteEdgeDraft({ mozbot, edgeId: block.outgoingEdgeId })
        const newBlock = duplicateBlockDraft(block)
        mozbot.groups[groupIndex].blocks.splice(blockIndex + 1, 0, newBlock)
      })
    ),
  detachBlockFromGroup: (indices: BlockIndices) =>
    setMozbot((mozbot) => produce(mozbot, removeBlockFromGroup(indices))),
  deleteBlock: ({ groupIndex, blockIndex }: BlockIndices) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        const removingBlock = mozbot.groups[groupIndex].blocks[blockIndex]
        deleteConnectedEdgesDraft(mozbot, removingBlock.id)
        removeBlockFromGroup({ groupIndex, blockIndex })(mozbot)
        removeEmptyGroups(mozbot)
      })
    ),
})

const removeBlockFromGroup =
  ({ groupIndex, blockIndex }: BlockIndices) =>
  (mozbot: Draft<MozbotV6>) => {
    mozbot.groups[groupIndex].blocks.splice(blockIndex, 1)
  }

export const createBlockDraft = (
  mozbot: Draft<MozbotV6>,
  block: BlockV6 | BlockV6['type'],
  { groupIndex, blockIndex }: BlockIndices
) => {
  const blocks = mozbot.groups[groupIndex].blocks
  if (
    blockIndex === blocks.length &&
    blockIndex > 0 &&
    blocks[blockIndex - 1].outgoingEdgeId
  )
    deleteEdgeDraft({
      mozbot,
      edgeId: blocks[blockIndex - 1].outgoingEdgeId as string,
      groupIndex,
    })
  const blockId =
    typeof block === 'string'
      ? createNewBlock(mozbot, block, { groupIndex, blockIndex })
      : moveBlockToGroup(mozbot, block, { groupIndex, blockIndex })
  removeEmptyGroups(mozbot)
  return blockId
}

const createNewBlock = (
  mozbot: Draft<Mozbot>,
  type: BlockV6['type'],
  { groupIndex, blockIndex }: BlockIndices
) => {
  const newBlock = parseNewBlock(type)
  mozbot.groups[groupIndex].blocks.splice(blockIndex ?? 0, 0, newBlock)
  return newBlock.id
}

const moveBlockToGroup = (
  mozbot: Draft<MozbotV6>,
  block: BlockV6,
  { groupIndex, blockIndex }: BlockIndices
) => {
  const newBlock = { ...block }
  if (block.outgoingEdgeId) {
    if (mozbot.groups[groupIndex].blocks.length > blockIndex ?? 0) {
      deleteEdgeDraft({ mozbot, edgeId: block.outgoingEdgeId, groupIndex })
      newBlock.outgoingEdgeId = undefined
    } else {
      const edgeIndex = mozbot.edges.findIndex(byId(block.outgoingEdgeId))
      if (edgeIndex === -1) newBlock.outgoingEdgeId = undefined
    }
  }
  const groupId = mozbot.groups[groupIndex].id
  mozbot.edges.forEach((edge) => {
    if (edge.to.blockId === block.id) {
      edge.to.groupId = groupId
    }
  })
  mozbot.groups[groupIndex].blocks.splice(blockIndex ?? 0, 0, newBlock)
}

export const duplicateBlockDraft = (block: BlockV6): BlockV6 => {
  const blockId = createId()
  if (blockHasItems(block))
    return {
      ...block,
      id: blockId,
      items: block.items?.map(duplicateItemDraft(blockId)),
      outgoingEdgeId: undefined,
    } as BlockV6
  return {
    ...block,
    id: blockId,
    outgoingEdgeId: undefined,
  }
}

export const deleteGroupDraft =
  (mozbot: Draft<MozbotV6>) => (groupIndex: number) => {
    deleteConnectedEdgesDraft(mozbot, mozbot.groups[groupIndex].id)
    mozbot.groups.splice(groupIndex, 1)
  }

export const removeEmptyGroups = (mozbot: Draft<MozbotV6>) => {
  const emptyGroupsIndices = mozbot.groups.reduce<number[]>(
    (arr, group, idx) => {
      group.blocks.length === 0 && arr.push(idx)
      return arr
    },
    []
  )
  emptyGroupsIndices.forEach(deleteGroupDraft(mozbot))
}
