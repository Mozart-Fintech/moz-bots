import {
  ItemIndices,
  Item,
  BlockWithItems,
  ConditionItem,
  ButtonItem,
  PictureChoiceItem,
} from '@mozbot.io/schemas'
import { SetMozbot } from '../MozbotProvider'
import { Draft, produce } from 'immer'
import { deleteConnectedEdgesDraft } from './edges'
import { byId } from '@mozbot.io/lib'
import { blockHasItems } from '@mozbot.io/schemas/helpers'
import { createId } from '@paralleldrive/cuid2'
import {
  BlockWithCreatableItems,
  DraggableItem,
} from '@/features/graph/providers/GraphDndProvider'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'
import { LogicBlockType } from '@mozbot.io/schemas/features/blocks/logic/constants'

type NewItem = Pick<DraggableItem, 'outgoingEdgeId'> & Partial<DraggableItem>

export type ItemsActions = {
  createItem: (item: NewItem, indices: ItemIndices) => void
  duplicateItem: (indices: ItemIndices) => void
  updateItem: (indices: ItemIndices, updates: Partial<Omit<Item, 'id'>>) => void
  detachItemFromBlock: (indices: ItemIndices) => void
  deleteItem: (indices: ItemIndices) => void
}

const createItem = (
  block: Draft<BlockWithCreatableItems>,
  item: NewItem,
  itemIndex: number
): Item => {
  switch (block.type) {
    case LogicBlockType.CONDITION: {
      const baseItem = item as ConditionItem
      const newItem = {
        ...baseItem,
        id: 'id' in item && item.id ? item.id : createId(),
        content: baseItem.content,
      }
      block.items.splice(itemIndex, 0, newItem)
      return newItem
    }
    case InputBlockType.CHOICE: {
      const baseItem = item as ButtonItem
      const newItem = {
        ...baseItem,
        id: 'id' in item && item.id ? item.id : createId(),
        content: baseItem.content,
      }
      block.items.splice(itemIndex, 0, newItem)
      return newItem
    }
    case InputBlockType.PICTURE_CHOICE: {
      const baseItem = item as PictureChoiceItem
      const newItem = {
        ...baseItem,
        id: 'id' in baseItem && item.id ? item.id : createId(),
      }
      block.items.splice(itemIndex, 0, newItem)
      return newItem
    }
  }
}

const duplicateItem = (
  block: Draft<BlockWithCreatableItems>,
  itemIndex: number
): Item => {
  const item = block.items[itemIndex]
  switch (block.type) {
    case LogicBlockType.CONDITION: {
      const baseItem = item as ConditionItem
      const newItem = {
        ...baseItem,
        id: createId(),
        content: baseItem.content,
      }
      block.items.splice(itemIndex + 1, 0, newItem)
      return newItem
    }
    case InputBlockType.CHOICE: {
      const baseItem = item as ButtonItem
      const newItem = {
        ...baseItem,
        id: createId(),
        content: baseItem.content,
      }
      block.items.splice(itemIndex + 1, 0, newItem)
      return newItem
    }
    case InputBlockType.PICTURE_CHOICE: {
      const baseItem = item as PictureChoiceItem
      const newItem = {
        ...baseItem,
        id: createId(),
      }
      block.items.splice(itemIndex + 1, 0, newItem)
      return newItem
    }
  }
}

const itemsAction = (setMozbot: SetMozbot): ItemsActions => ({
  createItem: (
    item: NewItem,
    { groupIndex, blockIndex, itemIndex }: ItemIndices
  ) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        const block = mozbot.groups[groupIndex].blocks[
          blockIndex
        ] as BlockWithCreatableItems

        const newItem = createItem(block, item, itemIndex)

        if (!newItem) return

        if (item.outgoingEdgeId) {
          const edgeIndex = mozbot.edges.findIndex(byId(item.outgoingEdgeId))
          edgeIndex !== -1
            ? (mozbot.edges[edgeIndex].from = {
                blockId: block.id,
                itemId: newItem.id,
              })
            : (newItem.outgoingEdgeId = undefined)
        }
      })
    ),
  duplicateItem: ({ groupIndex, blockIndex, itemIndex }: ItemIndices) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        const block = mozbot.groups[groupIndex].blocks[
          blockIndex
        ] as BlockWithCreatableItems
        duplicateItem(block, itemIndex)
      })
    ),
  updateItem: (
    { groupIndex, blockIndex, itemIndex }: ItemIndices,
    updates: Partial<Omit<Item, 'id'>>
  ) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        const block = mozbot.groups[groupIndex].blocks[blockIndex]
        if (!blockHasItems(block)) return
        ;(mozbot.groups[groupIndex].blocks[blockIndex] as BlockWithItems).items[
          itemIndex
        ] = {
          ...block.items[itemIndex],
          ...updates,
        } as Item
      })
    ),
  detachItemFromBlock: ({ groupIndex, blockIndex, itemIndex }: ItemIndices) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        const block = mozbot.groups[groupIndex].blocks[
          blockIndex
        ] as BlockWithItems
        block.items.splice(itemIndex, 1)
      })
    ),
  deleteItem: ({ groupIndex, blockIndex, itemIndex }: ItemIndices) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        const block = mozbot.groups[groupIndex].blocks[
          blockIndex
        ] as BlockWithItems
        if (block.items.length === 1) return
        const removingItem = block.items[itemIndex]
        block.items.splice(itemIndex, 1)
        deleteConnectedEdgesDraft(mozbot, removingItem.id)
      })
    ),
})

const duplicateItemDraft = (blockId: string) => (item: Item) => ({
  ...item,
  id: createId(),
  blockId,
  outgoingEdgeId: undefined,
})

export { itemsAction, duplicateItemDraft }
