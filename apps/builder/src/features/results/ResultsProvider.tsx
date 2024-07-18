import { useToast } from '@/hooks/useToast'
import {
  ResultHeaderCell,
  ResultWithAnswers,
  TableData,
  Mozbot,
} from '@mozbot.io/schemas'
import { createContext, ReactNode, useContext, useMemo } from 'react'
import { useMozbot } from '../editor/providers/MozbotProvider'
import { useResultsQuery } from './hooks/useResultsQuery'
import { trpc } from '@/lib/trpc'
import { isDefined } from '@mozbot.io/lib/utils'
import { LogicBlockType } from '@mozbot.io/schemas/features/blocks/logic/constants'
import { parseResultHeader } from '@mozbot.io/results/parseResultHeader'
import { convertResultsToTableData } from '@mozbot.io/results/convertResultsToTableData'
import { parseCellContent } from './helpers/parseCellContent'
import { timeFilterValues } from '../analytics/constants'
import { parseBlockIdVariableIdMap } from '@mozbot.io/results/parseBlockIdVariableIdMap'

const resultsContext = createContext<{
  resultsList: { results: ResultWithAnswers[] }[] | undefined
  flatResults: ResultWithAnswers[]
  hasNextPage: boolean
  resultHeader: ResultHeaderCell[]
  totalResults: number
  tableData: TableData[]
  onDeleteResults: (totalResultsDeleted: number) => void
  fetchNextPage: () => void
  refetchResults: () => void
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
}>({})

export const ResultsProvider = ({
  timeFilter,
  children,
  mozbotId,
  totalResults,
  onDeleteResults,
}: {
  timeFilter: (typeof timeFilterValues)[number]
  children: ReactNode
  mozbotId: string
  totalResults: number
  onDeleteResults: (totalResultsDeleted: number) => void
}) => {
  const { publishedMozbot } = useMozbot()
  const { showToast } = useToast()
  const { data, fetchNextPage, hasNextPage, refetch } = useResultsQuery({
    timeFilter,
    mozbotId,
    onError: (error) => {
      showToast({ description: error })
    },
  })

  const linkedmozbotIds =
    publishedMozbot?.groups
      .flatMap((group) => group.blocks)
      .reduce<string[]>((mozbotIds, block) => {
        if (block.type !== LogicBlockType.MOZBOT_LINK) return mozbotIds
        const mozbotId = block.options?.mozbotId
        return isDefined(mozbotId) &&
          !mozbotIds.includes(mozbotId) &&
          block.options?.mergeResults !== false
          ? [...mozbotIds, mozbotId]
          : mozbotIds
      }, []) ?? []

  const { data: linkedMozbotsData } = trpc.getLinkedMozbots.useQuery(
    {
      mozbotId,
    },
    {
      enabled: linkedmozbotIds.length > 0,
    }
  )

  const flatResults = useMemo(
    () => data?.flatMap((d) => d.results) ?? [],
    [data]
  )

  const resultHeader = useMemo(
    () =>
      publishedMozbot
        ? parseResultHeader(
            publishedMozbot,
            linkedMozbotsData?.mozbots as Pick<Mozbot, 'groups' | 'variables'>[]
          )
        : [],
    [linkedMozbotsData?.mozbots, publishedMozbot]
  )

  const tableData = useMemo(
    () =>
      publishedMozbot
        ? convertResultsToTableData({
            results: data?.flatMap((d) => d.results) ?? [],
            headerCells: resultHeader,
            cellParser: parseCellContent,
            blockIdVariableIdMap: parseBlockIdVariableIdMap(
              publishedMozbot.groups
            ),
          })
        : [],
    [publishedMozbot, data, resultHeader]
  )

  return (
    <resultsContext.Provider
      value={{
        resultsList: data,
        flatResults,
        hasNextPage: hasNextPage ?? true,
        tableData,
        resultHeader,
        totalResults,
        onDeleteResults,
        fetchNextPage,
        refetchResults: refetch,
      }}
    >
      {children}
    </resultsContext.Provider>
  )
}

export const useResults = () => useContext(resultsContext)
