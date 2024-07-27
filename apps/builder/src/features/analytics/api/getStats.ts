import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { canReadMozbots } from '@/helpers/databaseRules'
import { Stats, statsSchema } from '@mozbot.io/schemas'
import { defaultTimeFilter, timeFilterValues } from '../constants'
import {
  parseFromDateFromTimeFilter,
  parseToDateFromTimeFilter,
} from '../helpers/parseDateFromTimeFilter'

export const getStats = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/mozbots/{mozbotId}/analytics/stats',
      protect: true,
      summary: 'Obtener estadísticas de resultados',
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
  .output(z.object({ stats: statsSchema }))
  .query(
    async ({ input: { mozbotId, timeFilter, timeZone }, ctx: { user } }) => {
      const mozbot = await prisma.mozbot.findFirst({
        where: canReadMozbots(mozbotId, user),
        select: { publishedMozbot: true, id: true },
      })
      if (!mozbot?.publishedMozbot)
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Mozbot publicado no encontrado',
        })

      const fromDate = parseFromDateFromTimeFilter(timeFilter, timeZone)
      const toDate = parseToDateFromTimeFilter(timeFilter, timeZone)

      const [totalViews, totalStarts, totalCompleted] =
        await prisma.$transaction([
          prisma.result.count({
            where: {
              mozbotId: mozbot.id,
              isArchived: false,
              createdAt: fromDate
                ? {
                    gte: fromDate,
                    lte: toDate ?? undefined,
                  }
                : undefined,
            },
          }),
          prisma.result.count({
            where: {
              mozbotId: mozbot.id,
              isArchived: false,
              hasStarted: true,
              createdAt: fromDate
                ? {
                    gte: fromDate,
                    lte: toDate ?? undefined,
                  }
                : undefined,
            },
          }),
          prisma.result.count({
            where: {
              mozbotId: mozbot.id,
              isArchived: false,
              isCompleted: true,
              createdAt: fromDate
                ? {
                    gte: fromDate,
                    lte: toDate ?? undefined,
                  }
                : undefined,
            },
          }),
        ])

      const stats: Stats = {
        totalViews,
        totalStarts,
        totalCompleted,
      }

      return {
        stats,
      }
    }
  )
