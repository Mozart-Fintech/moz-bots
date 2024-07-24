import { SetVariableLabel } from '@/components/SetVariableLabel'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { Stack, Text } from '@chakra-ui/react'
import { OpenAIBlock } from '@mozbot.io/schemas/features/blocks/integrations/openai'

type Props = {
  options: OpenAIBlock['options']
}

export const OpenAINodeBody = ({ options }: Props) => {
  const { mozbot } = useMozbot()

  return (
    <Stack>
      <Text color={options?.task ? 'currentcolor' : 'gray.500'} noOfLines={1}>
        {options?.task ?? 'Configure...'}
      </Text>
      {mozbot &&
        options &&
        'responseMapping' in options &&
        options.responseMapping
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
      {mozbot &&
        options &&
        'saveUrlInVariableId' in options &&
        options.saveUrlInVariableId && (
          <SetVariableLabel
            variables={mozbot.variables}
            variableId={options.saveUrlInVariableId}
          />
        )}
      {mozbot &&
        options &&
        'saveTextInVariableId' in options &&
        options.saveTextInVariableId && (
          <SetVariableLabel
            variables={mozbot.variables}
            variableId={options.saveTextInVariableId}
          />
        )}
    </Stack>
  )
}
