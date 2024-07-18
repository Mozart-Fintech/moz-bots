import prisma from '@mozbot.io/lib/prisma'
import { canWriteMozbots } from '@/helpers/databaseRules'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { Block, HttpRequestBlock, parseGroups } from '@mozbot.io/schemas'
import { byId } from '@mozbot.io/lib'
import { isWebhookBlock } from '@mozbot.io/schemas/helpers'
import { z } from 'zod'

export const subscribeWebhook = authenticatedProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/mozbots/{mozbotId}/webhookBlocks/{blockId}/subscribe',
      protect: true,
      summary: 'Subscribe to webhook block',
      tags: ['Webhook'],
    },
  })
  .input(
    z.object({
      mozbotId: z.string(),
      blockId: z.string(),
      url: z.string(),
    })
  )
  .output(
    z.object({
      id: z.string(),
      url: z.string().nullable(),
    })
  )
  .query(async ({ input: { mozbotId, blockId, url }, ctx: { user } }) => {
    const mozbot = await prisma.mozbot.findFirst({
      where: canWriteMozbots(mozbotId, user),
      select: {
        version: true,
        groups: true,
      },
    })

    if (!mozbot)
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Mozbot not found' })

    const groups = parseGroups(mozbot.groups, {
      mozbotVersion: mozbot.version,
    })

    const webhookBlock = groups
      .flatMap<Block>((g) => g.blocks)
      .find(byId(blockId)) as HttpRequestBlock | null

    if (!webhookBlock || !isWebhookBlock(webhookBlock))
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Webhook block not found',
      })

    if (webhookBlock.options?.webhook || mozbot.version === '6') {
      const updatedGroups = groups.map((group) =>
        group.blocks.some((b) => b.id === webhookBlock.id)
          ? {
              ...group,
              blocks: group.blocks.map((block) =>
                block.id !== webhookBlock.id
                  ? block
                  : {
                      ...block,
                      options: {
                        ...webhookBlock.options,
                        webhook: {
                          ...webhookBlock.options?.webhook,
                          url,
                        },
                      },
                    }
              ),
            }
          : group
      )
      await prisma.mozbot.updateMany({
        where: { id: mozbotId },
        data: {
          groups: updatedGroups,
        },
      })
    } else {
      if ('webhookId' in webhookBlock)
        await prisma.webhook.update({
          where: { id: webhookBlock.webhookId },
          data: { url },
        })
      else
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Webhook block not found',
        })
    }

    return {
      id: blockId,
      url,
    }
  })
