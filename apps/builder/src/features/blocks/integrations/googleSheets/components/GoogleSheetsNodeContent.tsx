import React from 'react'
import { Stack, Text } from '@chakra-ui/react'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { SetVariableLabel } from '@/components/SetVariableLabel'
import { GoogleSheetsBlock } from '@mozbot.io/schemas'
import { GoogleSheetsAction } from '@mozbot.io/schemas/features/blocks/integrations/googleSheets/constants'

type Props = {
  options?: GoogleSheetsBlock['options']
}

export const GoogleSheetsNodeContent = ({ options }: Props) => {
  const { mozbot } = useMozbot()
  return (
    <Stack>
      <Text color={options?.action ? 'currentcolor' : 'gray.500'} noOfLines={1}>
        {options?.action ?? 'Configure...'}
      </Text>
      {mozbot &&
        options?.action === GoogleSheetsAction.GET &&
        options?.cellsToExtract
          ?.map((mapping) => mapping.variableId)
          .map((variableId, idx) =>
            variableId ? (
              <SetVariableLabel
                key={variableId + idx}
                variables={mozbot.variables}
                variableId={variableId}
              />
            ) : null
          )}
    </Stack>
  )
}
