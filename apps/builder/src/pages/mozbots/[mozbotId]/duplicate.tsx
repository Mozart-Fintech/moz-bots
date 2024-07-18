import { EmojiOrImageIcon } from '@/components/EmojiOrImageIcon'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { useWorkspace } from '@/features/workspace/WorkspaceProvider'
import { trpc } from '@/lib/trpc'
import { Text, HStack, Button, Stack } from '@chakra-ui/react'
import { PlanTag } from '@/features/billing/components/PlanTag'
import { HardDriveIcon } from '@/components/icons'
import { useRouter } from 'next/router'
import { RadioButtons } from '@/components/inputs/RadioButtons'
import { useState } from 'react'

const Page = () => {
  const { push } = useRouter()
  const { mozbot } = useMozbot()
  const { workspaces } = useWorkspace()
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>()
  const { mutate, isLoading } = trpc.mozbot.importMozbot.useMutation({
    onSuccess: (data) => {
      push(`/mozbots/${data.mozbot.id}/edit`)
    },
  })

  const duplicateMozbot = (workspaceId: string) => {
    mutate({ workspaceId, mozbot })
  }

  const updateSelectedWorkspaceId = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId)
  }

  return (
    <Stack
      w="full"
      justifyContent="center"
      pt="10"
      h="100vh"
      maxW="350px"
      mx="auto"
      spacing={4}
    >
      <Text>
        Choose a workspace to duplicate <strong>{mozbot?.name}</strong> in:
      </Text>
      <RadioButtons
        direction="column"
        options={workspaces?.map((workspace) => ({
          value: workspace.id,
          label: (
            <HStack w="full">
              <EmojiOrImageIcon
                icon={workspace.icon}
                boxSize="16px"
                defaultIcon={HardDriveIcon}
              />
              <Text>{workspace.name}</Text>
              <PlanTag plan={workspace.plan} />
            </HStack>
          ),
        }))}
        value={selectedWorkspaceId}
        onSelect={updateSelectedWorkspaceId}
      />
      <Button
        isDisabled={!selectedWorkspaceId}
        onClick={() => duplicateMozbot(selectedWorkspaceId as string)}
        isLoading={isLoading}
        colorScheme="blue"
        size="sm"
      >
        Duplicate
      </Button>
    </Stack>
  )
}

export default Page
