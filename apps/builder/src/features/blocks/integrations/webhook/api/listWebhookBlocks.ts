import prisma from '@mozbot.io/lib/prisma'
import { canReadMozbots } from '@/helpers/databaseRules'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { parseGroups } from '@mozbot.io/schemas/features/mozbot/group'
import { IntegrationBlockType } from '@mozbot.io/schemas/features/blocks/integrations/constants'
import { Block } from '@mozbot.io/schemas'
import { isWebhookBlock } from '@mozbot.io/schemas/helpers'
import { byId } from '@mozbot.io/lib'

export const listWebhookBlocks = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/mozbots/{mozbotId}/webhookBlocks',
      protect: true,
      summary: 'List webhook blocks',
      description:
        'Returns a list of all the webhook blocks that you can subscribe to.',
      tags: ['Webhook'],
    },
  })
  .input(
    z.object({
      mozbotId: z.string(),
    })
  )
  .output(
    z.object({
      webhookBlocks: z.array(
        z.object({
          id: z.string(),
          type: z.enum([
            IntegrationBlockType.WEBHOOK,
            IntegrationBlockType.ZAPIER,
            IntegrationBlockType.MAKE_COM,
            IntegrationBlockType.PABBLY_CONNECT,
          ]),
          label: z.string(),
          url: z.string().optional(),
        })
      ),
    })
  )
  .query(async ({ input: { mozbotId }, ctx: { user } }) => {
    const mozbot = await prisma.mozbot.findFirst({
      where: canReadMozbots(mozbotId, user),
      select: {
        version: true,
        groups: true,
        webhooks: true,
      },
    })
    if (!mozbot)
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Mozbot not found' })

    const groups = parseGroups(mozbot.groups, {
      mozbotVersion: mozbot.version,
    })

    const webhookBlocks = groups.reduce<
      {
        id: string
        label: string
        url: string | undefined
        type:
          | IntegrationBlockType.WEBHOOK
          | IntegrationBlockType.ZAPIER
          | IntegrationBlockType.MAKE_COM
          | IntegrationBlockType.PABBLY_CONNECT
      }[]
    >((webhookBlocks, group) => {
      const blocks = (group.blocks as Block[]).filter(isWebhookBlock)
      return [
        ...webhookBlocks,
        ...blocks.map((block) => ({
          id: block.id,
          type: block.type,
          label: `${group.title} > ${block.id}`,
          url:
            'webhookId' in block && !block.options?.webhook
              ? mozbot?.webhooks.find(byId(block.webhookId))?.url ?? undefined
              : block.options?.webhook?.url,
        })),
      ]
    }, [])

    return { webhookBlocks }
  })
