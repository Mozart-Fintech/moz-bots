import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import {
  Mozbot,
  publicMozbotSchema,
  publicMozbotSchemaV5,
  publicMozbotSchemaV6,
} from '@mozbot.io/schemas'
import { z } from 'zod'
import { isReadMozbotForbidden } from '../helpers/isReadMozbotForbidden'
import { migratePublicMozbot } from '@mozbot.io/migrations/migrateMozbot'

export const getPublishedMozbot = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/mozbots/{mozbotId}/publishedMozbot',
      protect: true,
      summary: 'Get published mozbot',
      tags: ['Mozbot'],
    },
  })
  .input(
    z.object({
      mozbotId: z
        .string()
        .describe(
          '[¿Dónde encontrar el ID de mi bot?](../how-to#how-to-find-my-mozbotId)'
        ),
      migrateToLatestVersion: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'If enabled, the mozbot will be converted to the latest schema version'
        ),
    })
  )
  .output(
    z.object({
      publishedMozbot: publicMozbotSchema.nullable(),
      version: z
        .enum([
          ...publicMozbotSchemaV5._def.schema.shape.version._def.values,
          publicMozbotSchemaV6.shape.version._def.value,
        ])
        .optional()
        .describe(
          'Proporciona la versión desde la que se migró el bot publicado si `migrateToLatestVersion` está configurado en `true`.'
        ),
    })
  )
  .query(
    async ({ input: { mozbotId, migrateToLatestVersion }, ctx: { user } }) => {
      const existingMozbot = await prisma.mozbot.findFirst({
        where: {
          id: mozbotId,
        },
        include: {
          collaborators: true,
          publishedMozbot: true,
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
        },
      })
      if (
        !existingMozbot?.id ||
        (await isReadMozbotForbidden(existingMozbot, user))
      )
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Mozbot no encontrado',
        })

      if (!existingMozbot.publishedMozbot)
        return {
          publishedMozbot: null,
        }

      try {
        const parsedMozbot = migrateToLatestVersion
          ? await migratePublicMozbot(
              publicMozbotSchema.parse(existingMozbot.publishedMozbot)
            )
          : publicMozbotSchema.parse(existingMozbot.publishedMozbot)

        return {
          publishedMozbot: parsedMozbot,
          version: migrateToLatestVersion
            ? ((existingMozbot.version ?? '3') as Mozbot['version'])
            : undefined,
        }
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'No se pudo analizar el mozbot publicado',
          cause: err,
        })
      }
    }
  )
