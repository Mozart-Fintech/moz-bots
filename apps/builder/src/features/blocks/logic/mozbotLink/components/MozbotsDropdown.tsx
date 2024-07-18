import { HStack, IconButton, Input } from '@chakra-ui/react'
import { ExternalLinkIcon } from '@/components/icons'
import { useToast } from '@/hooks/useToast'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Select } from '@/components/inputs/Select'
import { EmojiOrImageIcon } from '@/components/EmojiOrImageIcon'
import { useMozbots } from '@/features/dashboard/hooks/useMozbots'

type Props = {
  idsToExclude: string[]
  mozbotId?: string | 'current'
  currentWorkspaceId: string
  onSelect: (mozbotId: string | 'current' | undefined) => void
}

export const MozbotsDropdown = ({
  idsToExclude,
  mozbotId,
  onSelect,
  currentWorkspaceId,
}: Props) => {
  const { query } = useRouter()
  const { showToast } = useToast()
  const { mozbots, isLoading } = useMozbots({
    workspaceId: currentWorkspaceId,
    onError: (e) => showToast({ title: e.name, description: e.message }),
  })

  if (isLoading) return <Input value="Loading..." isDisabled />
  if (!mozbots || mozbots.length === 0)
    return <Input value="No mozbots found" isDisabled />
  return (
    <HStack>
      <Select
        selectedItem={mozbotId}
        items={[
          {
            label: 'Current mozbot',
            value: 'current',
          },
          ...(mozbots ?? [])
            .filter((mozbot) => !idsToExclude.includes(mozbot.id))
            .map((mozbot) => ({
              icon: (
                <EmojiOrImageIcon
                  icon={mozbot.icon}
                  boxSize="18px"
                  emojiFontSize="18px"
                />
              ),
              label: mozbot.name,
              value: mozbot.id,
            })),
        ]}
        onSelect={onSelect}
        placeholder={'Select a mozbot'}
      />
      {mozbotId && mozbotId !== 'current' && (
        <IconButton
          aria-label="Navigate to mozbot"
          icon={<ExternalLinkIcon />}
          as={Link}
          href={{
            pathname: '/mozbots/[mozbotId]/edit',
            query: {
              mozbotId,
              parentId: query.parentId
                ? Array.isArray(query.parentId)
                  ? query.parentId.concat(query.mozbotId?.toString() ?? '')
                  : [query.parentId, query.mozbotId?.toString() ?? '']
                : query.mozbotId ?? [],
            },
          }}
        />
      )}
    </HStack>
  )
}
