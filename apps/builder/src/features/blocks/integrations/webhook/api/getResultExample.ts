import prisma from '@mozbot.io/lib/prisma'
import { canReadMozbots } from '@/helpers/databaseRules'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { Mozbot } from '@mozbot.io/schemas'
import { z } from 'zod'
import { fetchLinkedMozbots } from '@/features/blocks/logic/mozbotLink/helpers/fetchLinkedMozbots'
import { parseSampleResult } from '@mozbot.io/bot-engine/blocks/integrations/webhook/parseSampleResult'
import { getBlockById } from '@mozbot.io/schemas/helpers'

export const getResultExample = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/mozbots/{mozbotId}/webhookBlocks/{blockId}/getResultExample',
      protect: true,
      summary: 'Obtener ejemplo de resultado',
      description:
        'Devuelve un resultado "falso" para el bloque de webhook para ayudarle a anticipar cómo se comportará el webhook.',
      tags: ['Webhook'],
    },
  })
  .input(
    z.object({
      mozbotId: z.string(),
      blockId: z.string(),
    })
  )
  .output(
    z.object({
      resultExample: z
        .record(z.any())
        .describe('Puede contener cualquier campo.'),
    })
  )
  .query(async ({ input: { mozbotId, blockId }, ctx: { user } }) => {
    const mozbot = (await prisma.mozbot.findFirst({
      where: canReadMozbots(mozbotId, user),
      select: {
        groups: true,
        edges: true,
        variables: true,
        events: true,
      },
    })) as Pick<Mozbot, 'groups' | 'edges' | 'variables' | 'events'> | null

    if (!mozbot)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Mozbot no encontrado',
      })

    const { group } = getBlockById(blockId, mozbot.groups)

    if (!group)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Bloque no encontrado',
      })

    const linkedMozbots = await fetchLinkedMozbots(mozbot, user)

    return {
      resultExample: await parseSampleResult(
        mozbot,
        linkedMozbots,
        user.email ?? undefined
      )(group.id, mozbot.variables),
    }
  })
