import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { isWriteMozbotForbidden } from '../helpers/isWriteMozbotForbidden'

export const unpublishMozbot = authenticatedProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/mozbots/{mozbotId}/unpublish',
      protect: true,
      summary: 'Unpublish a mozbot',
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
    })
  )
  .output(
    z.object({
      message: z.literal('success'),
    })
  )
  .mutation(async ({ input: { mozbotId }, ctx: { user } }) => {
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
                role: true,
              },
            },
          },
        },
      },
    })
    if (!existingMozbot?.publishedMozbot)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Mozbot publicado no encontrado',
      })

    if (
      !existingMozbot.id ||
      (await isWriteMozbotForbidden(existingMozbot, user))
    )
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Mozbot no encontrado',
      })

    await prisma.publicMozbot.deleteMany({
      where: {
        id: existingMozbot.publishedMozbot.id,
      },
    })

    return { message: 'success' }
  })
