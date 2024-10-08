import { createId } from '@paralleldrive/cuid2'
import { blockTypeHasItems } from '@mozbot.io/schemas/helpers'
import { BlockV6, BlockWithItems, ItemV6 } from '@mozbot.io/schemas'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'
import { LogicBlockType } from '@mozbot.io/schemas/features/blocks/logic/constants'

const parseDefaultItems = (type: BlockWithItems['type']): ItemV6[] => {
  switch (type) {
    case InputBlockType.CHOICE:
      return [{ id: createId() }]
    case InputBlockType.PICTURE_CHOICE:
      return [{ id: createId() }]
    case LogicBlockType.CONDITION:
      return [
        {
          id: createId(),
        },
      ]
    case LogicBlockType.AB_TEST:
      return [
        { id: createId(), path: 'a' },
        { id: createId(), path: 'b' },
      ]
  }
}

export const parseNewBlock = (type: BlockV6['type']) =>
  ({
    id: createId(),
    type,
    ...(blockTypeHasItems(type)
      ? { items: parseDefaultItems(type) }
      : undefined),
  } as BlockV6)
