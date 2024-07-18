import { Seo } from '@/components/Seo'
import { Flex, Spinner, useColorModeValue } from '@chakra-ui/react'
import {
  EditorProvider,
  useEditor,
  RightPanel as RightPanelEnum,
} from '../providers/EditorProvider'
import { useMozbot } from '../providers/MozbotProvider'
import { BlocksSideBar } from './BlocksSideBar'
import { BoardMenuButton } from './BoardMenuButton'
import { PreviewDrawer } from '@/features/preview/components/PreviewDrawer'
import { MozbotHeader } from './MozbotHeader'
import { Graph } from '@/features/graph/components/Graph'
import { GraphDndProvider } from '@/features/graph/providers/GraphDndProvider'
import { GraphProvider } from '@/features/graph/providers/GraphProvider'
import { EventsCoordinatesProvider } from '@/features/graph/providers/EventsCoordinateProvider'
import { MozbotNotFoundPage } from './MozbotNotFoundPage'
import { SuspectedMozbotBanner } from './SuspectedMozbotBanner'
import { useWorkspace } from '@/features/workspace/WorkspaceProvider'
import { VariablesDrawer } from '@/features/preview/components/VariablesDrawer'
import { VideoOnboardingFloatingWindow } from '@/features/onboarding/components/VideoOnboardingFloatingWindow'

export const EditorPage = () => {
  const { mozbot, currentUserMode, is404 } = useMozbot()
  const { workspace } = useWorkspace()
  const backgroundImage = useColorModeValue(
    'radial-gradient(#c6d0e1 1px, transparent 0)',
    'radial-gradient(#2f2f39 1px, transparent 0)'
  )
  const bgColor = useColorModeValue('#f4f5f8', 'gray.850')

  const isSuspicious = mozbot?.riskLevel === 100 && !workspace?.isVerified

  if (is404) return <MozbotNotFoundPage />

  return (
    <EditorProvider>
      <Seo title={mozbot?.name ? `${mozbot.name} | Editor` : 'Editor'} />
      <Flex overflow="clip" h="100vh" flexDir="column" id="editor-container">
        <VideoOnboardingFloatingWindow type="editor" />
        {isSuspicious && <SuspectedMozbotBanner mozbotId={mozbot.id} />}
        <MozbotHeader />
        <Flex
          flex="1"
          pos="relative"
          h="full"
          bgColor={bgColor}
          backgroundImage={backgroundImage}
          backgroundSize="40px 40px"
          backgroundPosition="-19px -19px"
        >
          {mozbot ? (
            <GraphDndProvider>
              {currentUserMode === 'write' && <BlocksSideBar />}
              <GraphProvider
                isReadOnly={
                  currentUserMode === 'read' || currentUserMode === 'guest'
                }
              >
                <EventsCoordinatesProvider events={mozbot.events}>
                  <Graph flex="1" mozbot={mozbot} key={mozbot.id} />
                  <BoardMenuButton
                    pos="absolute"
                    right="40px"
                    top={`calc(20px + ${isSuspicious ? '70px' : '0px'})`}
                  />
                  <RightPanel />
                </EventsCoordinatesProvider>
              </GraphProvider>
            </GraphDndProvider>
          ) : (
            <Flex justify="center" align="center" boxSize="full">
              <Spinner color="gray" />
            </Flex>
          )}
        </Flex>
      </Flex>
    </EditorProvider>
  )
}

const RightPanel = () => {
  const { rightPanel, setRightPanel } = useEditor()

  switch (rightPanel) {
    case RightPanelEnum.PREVIEW:
      return <PreviewDrawer />
    case RightPanelEnum.VARIABLES:
      return <VariablesDrawer onClose={() => setRightPanel(undefined)} />
    case undefined:
      return null
  }
}
