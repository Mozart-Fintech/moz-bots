import { isDefined } from '@mozbot.io/lib'
import {
  isChoiceInput,
  isConditionBlock,
  isPictureChoiceInput,
} from '@mozbot.io/schemas/helpers'
import { BlockV6 } from '@mozbot.io/schemas'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'
import { LogicBlockType } from '@mozbot.io/schemas/features/blocks/logic/constants'

export const hasDefaultConnector = (block: BlockV6) =>
  (!isChoiceInput(block) &&
    !isPictureChoiceInput(block) &&
    !isConditionBlock(block) &&
    block.type !== LogicBlockType.AB_TEST) ||
  (block.type === InputBlockType.CHOICE &&
    isDefined(block.options?.dynamicVariableId)) ||
  (block.type === InputBlockType.PICTURE_CHOICE &&
    block.options?.dynamicItems?.isEnabled &&
    block.options.dynamicItems.pictureSrcsVariableId)
