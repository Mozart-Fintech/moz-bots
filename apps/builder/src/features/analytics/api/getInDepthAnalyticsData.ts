import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { canReadMozbots } from '@/helpers/databaseRules'
import { totalAnswersSchema } from '@mozbot.io/schemas/features/analytics'
import { parseGroups } from '@mozbot.io/schemas'
import { isInputBlock } from '@mozbot.io/schemas/helpers'
import { defaultTimeFilter, timeFilterValues } from '../constants'
import {
  parseFromDateFromTimeFilter,
  parseToDateFromTimeFilter,
} from '../helpers/parseDateFromTimeFilter'

export const getInDepthAnalyticsData = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/mozbots/{mozbotId}/analytics/inDepthData',
      protect: true,
      summary:
        'List total answers in blocks and off-default paths visited edges',
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
      totalAnswers: z.array(totalAnswersSchema),
      offDefaultPathVisitedEdges: z.array(
        z.object({ edgeId: z.string(), total: z.number() })
      ),
    })
  )
  .query(
    async ({ input: { mozbotId, timeFilter, timeZone }, ctx: { user } }) => {
      const mozbot = await prisma.mozbot.findFirst({
        where: canReadMozbots(mozbotId, user),
        select: { publishedMozbot: true },
      })
      if (!mozbot?.publishedMozbot)
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Published mozbot not found',
        })

      const fromDate = parseFromDateFromTimeFilter(timeFilter, timeZone)
      const toDate = parseToDateFromTimeFilter(timeFilter, timeZone)

      const totalAnswersPerBlock = await prisma.answer.groupBy({
        by: ['blockId', 'resultId'],
        where: {
          result: {
            mozbotId: mozbot.publishedMozbot.mozbotId,
            createdAt: fromDate
              ? {
                  gte: fromDate,
                  lte: toDate ?? undefined,
                }
              : undefined,
          },
          blockId: {
            in: parseGroups(mozbot.publishedMozbot.groups, {
              mozbotVersion: mozbot.publishedMozbot.version,
            }).flatMap((group) =>
              group.blocks.filter(isInputBlock).map((block) => block.id)
            ),
          },
        },
      })

      const totalAnswersV2PerBlock = await prisma.answerV2.groupBy({
        by: ['blockId', 'resultId'],
        where: {
          result: {
            mozbotId: mozbot.publishedMozbot.mozbotId,
            createdAt: fromDate
              ? {
                  gte: fromDate,
                  lte: toDate ?? undefined,
                }
              : undefined,
          },
          blockId: {
            in: parseGroups(mozbot.publishedMozbot.groups, {
              mozbotVersion: mozbot.publishedMozbot.version,
            }).flatMap((group) =>
              group.blocks.filter(isInputBlock).map((block) => block.id)
            ),
          },
        },
      })

      const uniqueCounts = totalAnswersPerBlock
        .concat(totalAnswersV2PerBlock)
        .reduce<{
          [key: string]: Set<string>
        }>((acc, { blockId, resultId }) => {
          acc[blockId] = acc[blockId] || new Set()
          acc[blockId].add(resultId)
          return acc
        }, {})

      const offDefaultPathVisitedEdges = await prisma.visitedEdge.groupBy({
        by: ['edgeId'],
        where: {
          result: {
            mozbotId: mozbot.publishedMozbot.mozbotId,
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
        totalAnswers: Object.keys(uniqueCounts).map((blockId) => ({
          blockId,
          total: uniqueCounts[blockId].size,
        })),
        offDefaultPathVisitedEdges: offDefaultPathVisitedEdges.map((e) => ({
          edgeId: e.edgeId,
          total: e._count.resultId,
        })),
      }
    }
  )
