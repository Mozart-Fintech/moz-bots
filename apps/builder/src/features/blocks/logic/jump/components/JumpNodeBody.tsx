import React from 'react'
import { Tag, Text } from '@chakra-ui/react'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { byId, isDefined } from '@mozbot.io/lib'
import { JumpBlock } from '@mozbot.io/schemas/features/blocks/logic/jump'

type Props = {
  options: JumpBlock['options']
}

export const JumpNodeBody = ({ options }: Props) => {
  const { mozbot } = useMozbot()
  const selectedGroup = mozbot?.groups.find(byId(options?.groupId))
  const blockIndex = selectedGroup?.blocks.findIndex(byId(options?.blockId))
  if (!selectedGroup) return <Text color="gray.500">Configure...</Text>
  return (
    <Text>
      Jump to <Tag colorScheme="blue">{selectedGroup.title}</Tag>{' '}
      {isDefined(blockIndex) && blockIndex >= 0 ? (
        <>
          at block <Tag colorScheme="blue">{blockIndex + 1}</Tag>
        </>
      ) : null}
    </Text>
  )
}
