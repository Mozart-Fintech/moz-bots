import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { archiveResults } from '@mozbot.io/results/archiveResults'
import prisma from '@mozbot.io/lib/prisma'
import { isWriteMozbotForbidden } from '@/features/mozbot/helpers/isWriteMozbotForbidden'
import { Mozbot } from '@mozbot.io/schemas'

export const deleteResults = authenticatedProcedure
  .meta({
    openapi: {
      method: 'DELETE',
      path: '/v1/mozbots/{mozbotId}/results',
      protect: true,
      summary: 'Eliminar resultados',
      tags: ['Results'],
    },
  })
  .input(
    z.object({
      mozbotId: z
        .string()
        .describe(
          '[¿Dónde encontrar el ID de mi bot?](../how-to#how-to-find-my-mozbotId)'
        ),
      resultIds: z
        .string()
        .describe(
          'Lista de identificadores separados por comas. Si no se proporciona, se eliminarán todos los resultados. ⚠️'
        )
        .optional(),
    })
  )
  .output(z.void())
  .mutation(async ({ input, ctx: { user } }) => {
    const idsArray = input.resultIds?.split(',')
    const { mozbotId } = input
    const mozbot = await prisma.mozbot.findUnique({
      where: {
        id: mozbotId,
      },
      select: {
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
    if (!mozbot || (await isWriteMozbotForbidden(mozbot, user)))
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Mozbot no encontrado',
      })
    const { success } = await archiveResults(prisma)({
      mozbot: {
        groups: mozbot.groups,
      } as Pick<Mozbot, 'groups'>,
      resultsFilter: {
        id: (idsArray?.length ?? 0) > 0 ? { in: idsArray } : undefined,
        mozbotId,
      },
    })

    if (!success)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Mozbot no encontrado',
      })
  })
