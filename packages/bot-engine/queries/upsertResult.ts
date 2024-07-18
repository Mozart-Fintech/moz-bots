import prisma from '@mozbot.io/lib/prisma'
import { Prisma, SetVariableHistoryItem, VisitedEdge } from '@mozbot.io/prisma'
import { ContinueChatResponse, MozbotInSession } from '@mozbot.io/schemas'
import { filterNonSessionVariablesWithValues } from '@mozbot.io/variables/filterVariablesWithValues'
import { formatLogDetails } from '../logs/helpers/formatLogDetails'

type Props = {
  resultId: string
  mozbot: MozbotInSession
  hasStarted: boolean
  isCompleted: boolean
  lastChatSessionId?: string
  logs?: ContinueChatResponse['logs']
  visitedEdges?: VisitedEdge[]
  setVariableHistory?: SetVariableHistoryItem[]
}
export const upsertResult = ({
  resultId,
  mozbot,
  hasStarted,
  isCompleted,
  lastChatSessionId,
  logs,
  visitedEdges,
  setVariableHistory,
}: Props): Prisma.PrismaPromise<any> => {
  const variablesWithValue = filterNonSessionVariablesWithValues(
    mozbot.variables
  )
  const logsToCreate =
    logs && logs.length > 0
      ? {
          createMany: {
            data: logs.map((log) => ({
              ...log,
              details: formatLogDetails(log.details),
            })),
            skipDuplicates: true,
          },
        }
      : undefined

  const setVariableHistoryToCreate =
    setVariableHistory && setVariableHistory.length > 0
      ? ({
          createMany: {
            data: setVariableHistory.map((item) => ({
              ...item,
              value: item.value === null ? Prisma.JsonNull : item.value,
              resultId: undefined,
            })),
            skipDuplicates: true,
          },
        } as Prisma.SetVariableHistoryItemUpdateManyWithoutResultNestedInput)
      : undefined

  const visitedEdgesToCreate =
    visitedEdges && visitedEdges.length > 0
      ? {
          createMany: {
            data: visitedEdges.map((edge) => ({
              ...edge,
              resultId: undefined,
            })),
            skipDuplicates: true,
          },
        }
      : undefined

  return prisma.result.upsert({
    where: { id: resultId },
    update: {
      isCompleted: isCompleted ? true : undefined,
      hasStarted,
      variables: variablesWithValue,
      lastChatSessionId,
      logs: logsToCreate,
      setVariableHistory: setVariableHistoryToCreate,
      edges: visitedEdgesToCreate,
    },
    create: {
      id: resultId,
      mozbotId: mozbot.id,
      isCompleted: isCompleted ? true : false,
      hasStarted,
      variables: variablesWithValue,
      lastChatSessionId,
      logs: logsToCreate,
      setVariableHistory: setVariableHistoryToCreate,
      edges: visitedEdgesToCreate,
    },
    select: { id: true },
  })
}
