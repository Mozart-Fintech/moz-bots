import { isDefined } from '@mozbot.io/lib/utils'
import { InputBlock } from '@mozbot.io/schemas'
import { Variable } from '@mozbot.io/schemas/features/mozbot/variable'

export const getPrefilledInputValue =
  (variables: Variable[]) => (block: InputBlock) => {
    const variableValue = variables.find(
      (variable) =>
        variable.id === block.options?.variableId && isDefined(variable.value)
    )?.value
    if (!variableValue || Array.isArray(variableValue)) return
    return variableValue
  }
