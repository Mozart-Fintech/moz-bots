import { Stack } from '@chakra-ui/react'
import React, { useEffect, useState } from 'react'
import { LogsModal } from './LogsModal'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { useResults } from '../ResultsProvider'
import { ResultModal } from './ResultModal'
import { ResultsTable } from './table/ResultsTable'
import { useRouter } from 'next/router'
import { timeFilterValues } from '@/features/analytics/constants'

type Props = {
  timeFilter: (typeof timeFilterValues)[number]
  onTimeFilterChange: (timeFilter: (typeof timeFilterValues)[number]) => void
}
export const ResultsTableContainer = ({
  timeFilter,
  onTimeFilterChange,
}: Props) => {
  const { query } = useRouter()
  const {
    flatResults: results,
    fetchNextPage,
    hasNextPage,
    resultHeader,
    tableData,
  } = useResults()
  const { mozbot, publishedMozbot } = useMozbot()
  const [inspectingLogsResultId, setInspectingLogsResultId] = useState<
    string | null
  >(null)
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null)

  const handleLogsModalClose = () => setInspectingLogsResultId(null)

  const handleResultModalClose = () => setExpandedResultId(null)

  const handleLogOpenIndex = (index: number) => () => {
    if (!results[index]) return
    setInspectingLogsResultId(results[index].id)
  }

  const handleResultExpandIndex = (index: number) => () => {
    if (!results[index]) return
    setExpandedResultId(results[index].id)
  }

  useEffect(() => {
    if (query.id) setExpandedResultId(query.id as string)
  }, [query.id])

  return (
    <Stack pb="28" px={['4', '0']} spacing="4" maxW="1600px" w="full">
      {publishedMozbot && (
        <LogsModal
          mozbotId={publishedMozbot?.mozbotId}
          resultId={inspectingLogsResultId}
          onClose={handleLogsModalClose}
        />
      )}
      <ResultModal
        resultId={expandedResultId}
        onClose={handleResultModalClose}
      />

      {mozbot && (
        <ResultsTable
          preferences={mozbot.resultsTablePreferences ?? undefined}
          resultHeader={resultHeader}
          data={tableData}
          onScrollToBottom={fetchNextPage}
          hasMore={hasNextPage}
          timeFilter={timeFilter}
          onLogOpenIndex={handleLogOpenIndex}
          onResultExpandIndex={handleResultExpandIndex}
          onTimeFilterChange={onTimeFilterChange}
        />
      )}
    </Stack>
  )
}
