import { Seo } from '@/components/Seo'
import { Flex } from '@chakra-ui/react'
import { Standard } from '@mozbot.io/nextjs'
import { SettingsSideMenu } from './SettingsSideMenu'
import { MozbotHeader } from '@/features/editor/components/MozbotHeader'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { MozbotNotFoundPage } from '@/features/editor/components/MozbotNotFoundPage'
import { env } from '@mozbot.io/env'
import { headerHeight } from '@/features/editor/constants'

export const SettingsPage = () => {
  const { mozbot, is404 } = useMozbot()

  if (is404) return <MozbotNotFoundPage />
  return (
    <Flex overflow="hidden" h="100vh" flexDir="column">
      <Seo title={mozbot?.name ? `${mozbot.name} | Settings` : 'Settings'} />
      <MozbotHeader />
      <Flex height={`calc(100vh - ${headerHeight}px)`} w="full">
        <SettingsSideMenu />
        <Flex flex="1">
          {mozbot && (
            <Standard apiHost={env.NEXT_PUBLIC_VIEWER_URL[0]} mozbot={mozbot} />
          )}
        </Flex>
      </Flex>
    </Flex>
  )
}
