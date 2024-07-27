import prisma from '@mozbot.io/lib/prisma'
import { publicProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { mozbotSchema } from '@mozbot.io/schemas'
import { z } from 'zod'
import { isReadMozbotForbidden } from '../helpers/isReadMozbotForbidden'
import { migrateMozbot } from '@mozbot.io/migrations/migrateMozbot'
import { CollaborationType } from '@mozbot.io/prisma'
import { env } from '@mozbot.io/env'

export const getMozbot = publicProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/mozbots/{mozbotId}',
      protect: true,
      summary: 'Get a mozbot',
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
          'Si está habilitado, el mozbot se convertirá a la última versión del esquema.'
        ),
    })
  )
  .output(
    z.object({
      mozbot: mozbotSchema,
      currentUserMode: z.enum(['guest', 'read', 'write']),
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

      try {
        const parsedMozbot = migrateToLatestVersion
          ? await migrateMozbot(mozbotSchema.parse(existingMozbot))
          : mozbotSchema.parse(existingMozbot)

        return {
          mozbot: parsedMozbot,
          currentUserMode: getCurrentUserMode(user, existingMozbot),
        }
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'No se pudo analizar el mozbot',
          cause: err,
        })
      }
    }
  )

const getCurrentUserMode = (
  user: { email: string | null; id: string } | undefined,
  mozbot: { collaborators: { userId: string; type: CollaborationType }[] } & {
    workspace: { members: { userId: string }[] }
  }
) => {
  const collaborator = mozbot.collaborators.find((c) => c.userId === user?.id)
  const isMemberOfWorkspace = mozbot.workspace.members.some(
    (m) => m.userId === user?.id
  )
  if (
    collaborator?.type === 'WRITE' ||
    collaborator?.type === 'FULL_ACCESS' ||
    isMemberOfWorkspace
  )
    return 'write'

  if (collaborator) return 'read'
  if (user?.email && env.ADMIN_EMAIL?.includes(user.email)) return 'read'
  return 'guest'
}
