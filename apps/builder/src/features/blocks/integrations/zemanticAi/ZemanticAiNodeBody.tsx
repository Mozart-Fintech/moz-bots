import React from 'react'
import { Stack, Text } from '@chakra-ui/react'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { SetVariableLabel } from '@/components/SetVariableLabel'
import { ZemanticAiBlock } from '@mozbot.io/schemas'

type Props = {
  options: ZemanticAiBlock['options']
}

export const ZemanticAiNodeBody = ({
  options: { query, projectId, responseMapping } = {},
}: Props) => {
  const { mozbot } = useMozbot()
  return (
    <Stack>
      <Text
        color={query && projectId ? 'currentcolor' : 'gray.500'}
        noOfLines={1}
      >
        {query && projectId ? `Ask: ${query}` : 'Configure...'}
      </Text>
      {mozbot &&
        responseMapping
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
