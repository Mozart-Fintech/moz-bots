import { Stack } from '@chakra-ui/react'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { GroupsDropdown } from './GroupsDropdown'
import { MozbotsDropdown } from './MozbotsDropdown'
import { trpc } from '@/lib/trpc'
import { isNotEmpty } from '@mozbot.io/lib'
import { SwitchWithLabel } from '@/components/inputs/SwitchWithLabel'
import { MozbotLinkBlock } from '@mozbot.io/schemas'
import { defaultMozbotLinkOptions } from '@mozbot.io/schemas/features/blocks/logic/mozbotLink/constants'

type Props = {
  options: MozbotLinkBlock['options']
  onOptionsChange: (options: MozbotLinkBlock['options']) => void
}

export const MozbotLinkForm = ({ options, onOptionsChange }: Props) => {
  const { mozbot } = useMozbot()

  const handlemozbotIdChange = async (
    mozbotId: string | 'current' | undefined
  ) => onOptionsChange({ ...options, mozbotId, groupId: undefined })

  const { data: linkedMozbotData } = trpc.mozbot.getMozbot.useQuery(
    {
      mozbotId: options?.mozbotId as string,
    },
    {
      enabled: isNotEmpty(options?.mozbotId) && options?.mozbotId !== 'current',
    }
  )

  const handleGroupIdChange = (groupId: string | undefined) =>
    onOptionsChange({ ...options, groupId })

  const updateMergeResults = (mergeResults: boolean) =>
    onOptionsChange({ ...options, mergeResults })

  const isCurrentMozbotSelected =
    (mozbot && options?.mozbotId === mozbot.id) ||
    options?.mozbotId === 'current'

  return (
    <Stack>
      {mozbot && (
        <MozbotsDropdown
          idsToExclude={[mozbot.id]}
          mozbotId={options?.mozbotId}
          onSelect={handlemozbotIdChange}
          currentWorkspaceId={mozbot.workspaceId as string}
        />
      )}
      {options?.mozbotId && (
        <GroupsDropdown
          key={options.mozbotId}
          groups={
            mozbot && isCurrentMozbotSelected
              ? mozbot.groups
              : linkedMozbotData?.mozbot?.groups ?? []
          }
          groupId={options.groupId}
          onGroupIdSelected={handleGroupIdChange}
          isLoading={
            linkedMozbotData?.mozbot === undefined &&
            options.mozbotId !== 'current' &&
            mozbot &&
            mozbot.id !== options.mozbotId
          }
        />
      )}
      {!isCurrentMozbotSelected && (
        <SwitchWithLabel
          label="Merge answers"
          moreInfoContent="If enabled, the answers collected in the linked mozbot will be merged with the results of the current mozbot."
          initialValue={
            options?.mergeResults ?? defaultMozbotLinkOptions.mergeResults
          }
          onCheckChange={updateMergeResults}
        />
      )}
    </Stack>
  )
}
