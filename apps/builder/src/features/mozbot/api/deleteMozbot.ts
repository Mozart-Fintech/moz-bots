import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { Mozbot } from '@mozbot.io/schemas'
import { z } from 'zod'
import { isWriteMozbotForbidden } from '../helpers/isWriteMozbotForbidden'
import { archiveResults } from '@mozbot.io/results/archiveResults'

export const deleteMozbot = authenticatedProcedure
  .meta({
    openapi: {
      method: 'DELETE',
      path: '/v1/mozbots/{mozbotId}',
      protect: true,
      summary: 'Eliminar un mozbot',
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
      select: {
        id: true,
        groups: true,
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
        collaborators: {
          select: {
            userId: true,
            type: true,
          },
        },
      },
    })
    if (
      !existingMozbot?.id ||
      (await isWriteMozbotForbidden(existingMozbot, user))
    )
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Mozbot not found' })

    const { success } = await archiveResults(prisma)({
      mozbot: {
        groups: existingMozbot.groups,
      } as Pick<Mozbot, 'groups'>,
      resultsFilter: { mozbotId },
    })
    if (!success)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to archive results',
      })
    await prisma.publicMozbot.deleteMany({
      where: { mozbotId },
    })
    await prisma.mozbot.updateMany({
      where: { id: mozbotId },
      data: { isArchived: true, publicId: null, customDomain: null },
    })
    return {
      message: 'success',
    }
  })
