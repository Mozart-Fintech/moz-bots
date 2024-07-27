import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { isReadMozbotForbidden } from '@/features/mozbot/helpers/isReadMozbotForbidden'
import { isDefined } from '@mozbot.io/lib'
import { preprocessMozbot } from '@mozbot.io/schemas/features/mozbot/helpers/preprocessMozbot'
import { parseGroups } from '@mozbot.io/schemas/features/mozbot/group'
import { LogicBlockType } from '@mozbot.io/schemas/features/blocks/logic/constants'
import { mozbotV5Schema, mozbotV6Schema } from '@mozbot.io/schemas'

const pick = {
  version: true,
  groups: true,
  variables: true,
  name: true,
} as const

const output = z.object({
  mozbots: z.array(
    z.preprocess(
      preprocessMozbot,
      z.discriminatedUnion('version', [
        mozbotV5Schema._def.schema.pick(pick),
        mozbotV6Schema.pick(pick),
      ])
    )
  ),
})

export const getLinkedMozbots = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/mozbots/{mozbotId}/linkedMozbots',
      protect: true,
      summary: 'Obtener mozbots vinculados',
      tags: ['Mozbot'],
    },
  })
  .input(
    z.object({
      mozbotId: z.string(),
    })
  )
  .output(output)
  .query(async ({ input: { mozbotId }, ctx: { user } }) => {
    const mozbot = await prisma.mozbot.findFirst({
      where: {
        id: mozbotId,
      },
      select: {
        id: true,
        version: true,
        groups: true,
        variables: true,
        name: true,
        createdAt: true,
        workspace: {
          select: {
            isSuspended: true,
            isPastDue: true,
            members: {
              select: {
                userId: true,
              },
            },
          },
        },
        collaborators: {
          select: {
            type: true,
            userId: true,
          },
        },
      },
    })

    if (!mozbot || (await isReadMozbotForbidden(mozbot, user)))
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No se encontró ningún mozbot',
      })

    const linkedmozbotIds =
      parseGroups(mozbot.groups, { mozbotVersion: mozbot.version })
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

    if (!linkedmozbotIds.length) return { mozbots: [] }

    const mozbots = (
      await prisma.mozbot.findMany({
        where: {
          isArchived: { not: true },
          id: { in: linkedmozbotIds },
        },
        select: {
          id: true,
          version: true,
          groups: true,
          variables: true,
          name: true,
          createdAt: true,
          workspace: {
            select: {
              isSuspended: true,
              isPastDue: true,
              members: {
                select: {
                  userId: true,
                },
              },
            },
          },
          collaborators: {
            select: {
              type: true,
              userId: true,
            },
          },
        },
      })
    )
      .filter(async (mozbot) => !(await isReadMozbotForbidden(mozbot, user)))
      // To avoid the out of sort memory error, we sort the mozbots manually
      .sort((a, b) => {
        return b.createdAt.getTime() - a.createdAt.getTime()
      })
      .map((mozbot) => ({
        ...mozbot,
        groups: parseGroups(mozbot.groups, {
          mozbotVersion: mozbot.version,
        }),
        variables: mozbotV6Schema.shape.variables.parse(mozbot.variables),
      }))

    return {
      mozbots,
    }
  })
