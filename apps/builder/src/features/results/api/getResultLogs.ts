import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { logSchema } from '@mozbot.io/schemas'
import { z } from 'zod'
import { isReadMozbotForbidden } from '@/features/mozbot/helpers/isReadMozbotForbidden'

export const getResultLogs = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/mozbots/{mozbotId}/results/{resultId}/logs',
      protect: true,
      summary: 'Listar registros de resultados',
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
      resultId: z.string(),
    })
  )
  .output(z.object({ logs: z.array(logSchema) }))
  .query(async ({ input: { mozbotId, resultId }, ctx: { user } }) => {
    const mozbot = await prisma.mozbot.findUnique({
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
    if (!mozbot || (await isReadMozbotForbidden(mozbot, user)))
      throw new Error('Mozbot no encontrado')
    const logs = await prisma.log.findMany({
      where: {
        resultId,
      },
    })

    return { logs }
  })
