import React from 'react'
import { Text } from '@chakra-ui/react'
import { NumberInputBlock } from '@mozbot.io/schemas'
import { WithVariableContent } from '@/features/graph/components/nodes/block/WithVariableContent'
import { defaultNumberInputOptions } from '@mozbot.io/schemas/features/blocks/inputs/number/constants'

type Props = {
  options: NumberInputBlock['options']
}

export const NumberNodeContent = ({
  options: { variableId, labels } = {},
}: Props) =>
  variableId ? (
    <WithVariableContent variableId={variableId} />
  ) : (
    <Text color={'gray.500'}>
      {labels?.placeholder ?? defaultNumberInputOptions.labels.placeholder}
    </Text>
  )
