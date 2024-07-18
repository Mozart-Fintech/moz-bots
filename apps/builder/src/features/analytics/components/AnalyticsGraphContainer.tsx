import {
  Flex,
  Spinner,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import {
  Edge,
  GroupV6,
  Stats,
  TotalAnswers,
  TotalVisitedEdges,
} from '@mozbot.io/schemas'
import React, { useMemo } from 'react'
import { StatsCards } from './StatsCards'
import { ChangePlanModal } from '@/features/billing/components/ChangePlanModal'
import { Graph } from '@/features/graph/components/Graph'
import { GraphProvider } from '@/features/graph/providers/GraphProvider'
import { useTranslate } from '@tolgee/react'
import { trpc } from '@/lib/trpc'
import { isDefined } from '@mozbot.io/lib'
import { EventsCoordinatesProvider } from '@/features/graph/providers/EventsCoordinateProvider'
import { timeFilterValues } from '../constants'
import { blockHasItems, isInputBlock } from '@mozbot.io/schemas/helpers'

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

type Props = {
  timeFilter: (typeof timeFilterValues)[number]
  onTimeFilterChange: (timeFilter: (typeof timeFilterValues)[number]) => void
  stats?: Stats
}

export const AnalyticsGraphContainer = ({
  timeFilter,
  onTimeFilterChange,
  stats,
}: Props) => {
  const { t } = useTranslate()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { mozbot, publishedMozbot } = useMozbot()
  const { data } = trpc.analytics.getInDepthAnalyticsData.useQuery(
    {
      mozbotId: mozbot?.id as string,
      timeFilter,
      timeZone,
    },
    { enabled: isDefined(publishedMozbot) }
  )

  const totalVisitedEdges = useMemo(() => {
    if (
      !publishedMozbot?.edges ||
      !publishedMozbot.groups ||
      !publishedMozbot.events ||
      !data?.totalAnswers ||
      !stats?.totalViews
    )
      return
    const firstEdgeId = publishedMozbot.events[0].outgoingEdgeId
    if (!firstEdgeId) return
    return populateEdgesWithVisitData({
      edgeId: firstEdgeId,
      edges: publishedMozbot.edges,
      groups: publishedMozbot.groups,
      currentTotalUsers: stats.totalViews,
      totalVisitedEdges: data.offDefaultPathVisitedEdges
        ? [...data.offDefaultPathVisitedEdges]
        : [],
      totalAnswers: data.totalAnswers,
      edgeVisitHistory: [],
    })
  }, [
    data?.offDefaultPathVisitedEdges,
    data?.totalAnswers,
    publishedMozbot?.edges,
    publishedMozbot?.groups,
    publishedMozbot?.events,
    stats?.totalViews,
  ])

  return (
    <Flex
      w="full"
      pos="relative"
      bgColor={useColorModeValue('#f4f5f8', 'gray.850')}
      backgroundImage={useColorModeValue(
        'radial-gradient(#c6d0e1 1px, transparent 0)',
        'radial-gradient(#2f2f39 1px, transparent 0)'
      )}
      backgroundSize="40px 40px"
      backgroundPosition="-19px -19px"
      h="full"
      justifyContent="center"
    >
      {publishedMozbot && stats ? (
        <GraphProvider isReadOnly isAnalytics>
          <EventsCoordinatesProvider events={publishedMozbot?.events}>
            <Graph
              flex="1"
              mozbot={publishedMozbot}
              onUnlockProPlanClick={onOpen}
              totalAnswers={data?.totalAnswers}
              totalVisitedEdges={totalVisitedEdges}
            />
          </EventsCoordinatesProvider>
        </GraphProvider>
      ) : (
        <Flex
          justify="center"
          align="center"
          boxSize="full"
          bgColor="rgba(255, 255, 255, 0.5)"
        >
          <Spinner color="gray" />
        </Flex>
      )}
      <ChangePlanModal
        onClose={onClose}
        isOpen={isOpen}
        type={t('billing.limitMessage.analytics')}
        excludedPlans={['STARTER']}
      />
      <StatsCards
        stats={stats}
        pos="absolute"
        timeFilter={timeFilter}
        onTimeFilterChange={onTimeFilterChange}
      />
    </Flex>
  )
}

const populateEdgesWithVisitData = ({
  edgeId,
  edges,
  groups,
  currentTotalUsers,
  totalVisitedEdges,
  totalAnswers,
  edgeVisitHistory,
}: {
  edgeId: string
  edges: Edge[]
  groups: GroupV6[]
  currentTotalUsers: number
  totalVisitedEdges: TotalVisitedEdges[]
  totalAnswers: TotalAnswers[]
  edgeVisitHistory: string[]
}): TotalVisitedEdges[] => {
  if (edgeVisitHistory.find((e) => e === edgeId)) return totalVisitedEdges
  totalVisitedEdges.push({
    edgeId,
    total: currentTotalUsers,
  })
  edgeVisitHistory.push(edgeId)
  const edge = edges.find((edge) => edge.id === edgeId)
  if (!edge) return totalVisitedEdges
  const group = groups.find((group) => edge?.to.groupId === group.id)
  if (!group) return totalVisitedEdges
  for (const block of edge.to.blockId
    ? group.blocks.slice(
        group.blocks.findIndex((b) => b.id === edge.to.blockId)
      )
    : group.blocks) {
    if (blockHasItems(block)) {
      for (const item of block.items) {
        if (item.outgoingEdgeId) {
          totalVisitedEdges = populateEdgesWithVisitData({
            edgeId: item.outgoingEdgeId,
            edges,
            groups,
            currentTotalUsers:
              totalVisitedEdges.find(
                (tve) => tve.edgeId === item.outgoingEdgeId
              )?.total ?? 0,
            totalVisitedEdges,
            totalAnswers,
            edgeVisitHistory,
          })
        }
      }
    }
    if (block.outgoingEdgeId) {
      const totalUsers = isInputBlock(block)
        ? totalAnswers.find((a) => a.blockId === block.id)?.total
        : currentTotalUsers
      totalVisitedEdges = populateEdgesWithVisitData({
        edgeId: block.outgoingEdgeId,
        edges,
        groups,
        currentTotalUsers: totalUsers ?? 0,
        totalVisitedEdges,
        totalAnswers,
        edgeVisitHistory,
      })
    }
  }

  return totalVisitedEdges
}
