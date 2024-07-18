import React from 'react'
import { Stack, Text } from '@chakra-ui/react'
import { WithVariableContent } from '@/features/graph/components/nodes/block/WithVariableContent'
import { TextInputBlock } from '@mozbot.io/schemas'
import { defaultTextInputOptions } from '@mozbot.io/schemas/features/blocks/inputs/text/constants'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { SetVariableLabel } from '@/components/SetVariableLabel'

type Props = {
  options: TextInputBlock['options']
}

export const TextInputNodeContent = ({ options }: Props) => {
  const { mozbot } = useMozbot()
  const attachmentVariableId =
    mozbot &&
    options?.attachments?.isEnabled &&
    options?.attachments.saveVariableId
  if (options?.variableId)
    return (
      <Stack w="calc(100% - 25px)">
        <WithVariableContent
          variableId={options?.variableId}
          h={options.isLong ? '100px' : 'auto'}
        />
        {attachmentVariableId && (
          <SetVariableLabel
            variables={mozbot.variables}
            variableId={attachmentVariableId}
          />
        )}
      </Stack>
    )
  return (
    <Stack>
      <Text color={'gray.500'} h={options?.isLong ? '100px' : 'auto'}>
        {options?.labels?.placeholder ??
          defaultTextInputOptions.labels.placeholder}
      </Text>
      {attachmentVariableId && (
        <SetVariableLabel
          variables={mozbot.variables}
          variableId={attachmentVariableId}
        />
      )}
    </Stack>
  )
}
