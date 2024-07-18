import { isDefined, byId } from '@mozbot.io/lib'
import {
  getBlockById,
  blockHasItems,
  isInputBlock,
} from '@mozbot.io/schemas/helpers'
import { Block, SessionState } from '@mozbot.io/schemas'

type Props = {
  mozbotsQueue: SessionState['mozbotsQueue']
  progressMetadata: NonNullable<SessionState['progressMetadata']>
  currentInputBlockId: string | undefined
}

export const computeCurrentProgress = ({
  mozbotsQueue,
  progressMetadata,
  currentInputBlockId,
}: Props) => {
  if (!currentInputBlockId) return
  const paths = computePossibleNextInputBlocks({
    mozbotsQueue: mozbotsQueue,
    blockId: currentInputBlockId,
    visitedBlocks: {
      [mozbotsQueue[0].mozbot.id]: [],
    },
    currentPath: [],
  })
  return (
    ((progressMetadata.totalAnswers + 1) /
      (Math.max(...paths.map((b) => b.length)) +
        (progressMetadata.totalAnswers + 1))) *
    100
  )
}

const computePossibleNextInputBlocks = ({
  currentPath,
  mozbotsQueue,
  blockId,
  visitedBlocks,
}: {
  currentPath: string[]
  mozbotsQueue: SessionState['mozbotsQueue']
  blockId: string
  visitedBlocks: {
    [key: string]: string[]
  }
}): string[][] => {
  if (visitedBlocks[mozbotsQueue[0].mozbot.id].includes(blockId)) return []
  visitedBlocks[mozbotsQueue[0].mozbot.id].push(blockId)

  const possibleNextInputBlocks: string[][] = []

  const { block, group, blockIndex } = getBlockById(
    blockId,
    mozbotsQueue[0].mozbot.groups
  )

  if (isInputBlock(block)) currentPath.push(block.id)

  const outgoingEdgeIds = getBlockOutgoingEdgeIds(block)

  for (const outgoingEdgeId of outgoingEdgeIds) {
    const to = mozbotsQueue[0].mozbot.edges.find(
      (e) => e.id === outgoingEdgeId
    )?.to
    if (!to) continue
    const blockId =
      to.blockId ??
      mozbotsQueue[0].mozbot.groups.find((g) => g.id === to.groupId)?.blocks[0]
        .id
    if (!blockId) continue
    possibleNextInputBlocks.push(
      ...computePossibleNextInputBlocks({
        mozbotsQueue,
        blockId,
        visitedBlocks,
        currentPath,
      })
    )
  }

  for (const block of group.blocks.slice(blockIndex + 1)) {
    possibleNextInputBlocks.push(
      ...computePossibleNextInputBlocks({
        mozbotsQueue,
        blockId: block.id,
        visitedBlocks,
        currentPath,
      })
    )
  }

  if (outgoingEdgeIds.length > 0 || group.blocks.length !== blockIndex + 1)
    return possibleNextInputBlocks

  if (mozbotsQueue.length > 1) {
    const nextEdgeId = mozbotsQueue[0].edgeIdToTriggerWhenDone
    const to = mozbotsQueue[1].mozbot.edges.find(byId(nextEdgeId))?.to
    if (!to) return possibleNextInputBlocks
    const blockId =
      to.blockId ??
      mozbotsQueue[0].mozbot.groups.find((g) => g.id === to.groupId)?.blocks[0]
        .id
    if (blockId) {
      possibleNextInputBlocks.push(
        ...computePossibleNextInputBlocks({
          mozbotsQueue: mozbotsQueue.slice(1),
          blockId,
          visitedBlocks: {
            ...visitedBlocks,
            [mozbotsQueue[1].mozbot.id]: [],
          },
          currentPath,
        })
      )
    }
  }

  possibleNextInputBlocks.push(currentPath)

  return possibleNextInputBlocks
}

const getBlockOutgoingEdgeIds = (block: Block) => {
  const edgeIds: string[] = []
  if (blockHasItems(block)) {
    edgeIds.push(...block.items.map((i) => i.outgoingEdgeId).filter(isDefined))
  }
  if (block.outgoingEdgeId) edgeIds.push(block.outgoingEdgeId)
  return edgeIds
}
