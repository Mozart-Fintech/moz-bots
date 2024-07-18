import { TextLink } from '@/components/TextLink'
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader'
import { useWorkspace } from '@/features/workspace/WorkspaceProvider'
import { Heading, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function Page() {
  const { replace } = useRouter()
  const { workspace } = useWorkspace()

  useEffect(() => {
    if (!workspace || workspace.isSuspended) return
    replace('/mozbots')
  }, [replace, workspace])

  return (
    <>
      <DashboardHeader />
      <VStack
        w="full"
        h="calc(100vh - 64px)"
        justifyContent="center"
        spacing={4}
      >
        <Heading>Your workspace has been suspended.</Heading>
        <Text>
          We detected that one of your mozbots does not comply with our{' '}
          <TextLink
            href="https://mozbot.io/terms-of-service#scam-mozbots"
            isExternal
          >
            terms of service
          </TextLink>
        </Text>
      </VStack>
    </>
  )
}
