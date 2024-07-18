import { MozbotLinkBlock } from '@mozbot.io/schemas'
import React from 'react'
import { Tag, Text } from '@chakra-ui/react'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { byId, isNotEmpty } from '@mozbot.io/lib'
import { trpc } from '@/lib/trpc'

type Props = {
  block: MozbotLinkBlock
}

export const MozbotLinkNode = ({ block }: Props) => {
  const { mozbot } = useMozbot()

  const { data: linkedMozbotData } = trpc.mozbot.getMozbot.useQuery(
    {
      mozbotId: block.options?.mozbotId as string,
    },
    {
      enabled:
        isNotEmpty(block.options?.mozbotId) &&
        block.options?.mozbotId !== 'current',
    }
  )

  const isCurrentMozbot =
    mozbot &&
    (block.options?.mozbotId === mozbot.id ||
      block.options?.mozbotId === 'current')
  const linkedMozbot = isCurrentMozbot ? mozbot : linkedMozbotData?.mozbot
  const blockTitle = linkedMozbot?.groups.find(
    byId(block.options?.groupId)
  )?.title

  if (!block.options?.mozbotId)
    return <Text color="gray.500">Configure...</Text>
  return (
    <Text>
      Jump{' '}
      {blockTitle ? (
        <>
          to <Tag>{blockTitle}</Tag>
        </>
      ) : (
        <></>
      )}{' '}
      {!isCurrentMozbot ? (
        <>
          in <Tag colorScheme="blue">{linkedMozbot?.name}</Tag>
        </>
      ) : (
        <></>
      )}
    </Text>
  )
}
