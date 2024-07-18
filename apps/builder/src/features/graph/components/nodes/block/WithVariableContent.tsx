import { chakra, Text, TextProps } from '@chakra-ui/react'
import React from 'react'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { byId } from '@mozbot.io/lib'

type Props = {
  variableId: string
} & TextProps

export const WithVariableContent = ({ variableId, ...props }: Props) => {
  const { mozbot } = useMozbot()
  const variableName = mozbot?.variables.find(byId(variableId))?.name

  return (
    <Text w="calc(100% - 25px)" {...props}>
      Collect{' '}
      <chakra.span
        bgColor="orange.400"
        color="white"
        rounded="md"
        py="0.5"
        px="1"
      >
        {variableName}
      </chakra.span>
    </Text>
  )
}
