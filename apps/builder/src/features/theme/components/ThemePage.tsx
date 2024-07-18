import { Seo } from '@/components/Seo'
import { MozbotHeader } from '@/features/editor/components/MozbotHeader'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { Flex } from '@chakra-ui/react'
import { Standard } from '@mozbot.io/nextjs'
import { ThemeSideMenu } from './ThemeSideMenu'
import { MozbotNotFoundPage } from '@/features/editor/components/MozbotNotFoundPage'
import { headerHeight } from '@/features/editor/constants'

export const ThemePage = () => {
  const { mozbot, is404 } = useMozbot()

  if (is404) return <MozbotNotFoundPage />
  return (
    <Flex overflow="hidden" h="100vh" flexDir="column">
      <Seo title={mozbot?.name ? `${mozbot.name} | Theme` : 'Theme'} />
      <MozbotHeader />
      <Flex w="full" height={`calc(100vh - ${headerHeight}px)`}>
        <ThemeSideMenu />
        <Flex flex="1">
          {mozbot && (
            <Standard
              mozbot={mozbot}
              style={{
                width: '100%',
                height: '100%',
              }}
            />
          )}
        </Flex>
      </Flex>
    </Flex>
  )
}
