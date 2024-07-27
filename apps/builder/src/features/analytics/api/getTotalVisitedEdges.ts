import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { canReadMozbots } from '@/helpers/databaseRules'
import { totalVisitedEdgesSchema } from '@mozbot.io/schemas'
import { defaultTimeFilter, timeFilterValues } from '../constants'
import {
  parseFromDateFromTimeFilter,
  parseToDateFromTimeFilter,
} from '../helpers/parseDateFromTimeFilter'

export const getTotalVisitedEdges = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/mozbots/{mozbotId}/analytics/totalVisitedEdges',
      protect: true,
      summary: 'Enumerar los bordes totales utilizados en los resultados',
      tags: ['Analytics'],
    },
  })
  .input(
    z.object({
      mozbotId: z.string(),
      timeFilter: z.enum(timeFilterValues).default(defaultTimeFilter),
      timeZone: z.string().optional(),
    })
  )
  .output(
    z.object({
      totalVisitedEdges: z.array(totalVisitedEdgesSchema),
    })
  )
  .query(
    async ({ input: { mozbotId, timeFilter, timeZone }, ctx: { user } }) => {
      const mozbot = await prisma.mozbot.findFirst({
        where: canReadMozbots(mozbotId, user),
        select: { id: true },
      })
      if (!mozbot?.id)
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Mozbot publicado no encontrado',
        })

      const fromDate = parseFromDateFromTimeFilter(timeFilter, timeZone)
      const toDate = parseToDateFromTimeFilter(timeFilter, timeZone)

      const edges = await prisma.visitedEdge.groupBy({
        by: ['edgeId'],
        where: {
          result: {
            mozbotId: mozbot.id,
            createdAt: fromDate
              ? {
                  gte: fromDate,
                  lte: toDate ?? undefined,
                }
              : undefined,
          },
        },
        _count: { resultId: true },
      })

      return {
        totalVisitedEdges: edges.map((e) => ({
          edgeId: e.edgeId,
          total: e._count.resultId,
        })),
      }
    }
  )
