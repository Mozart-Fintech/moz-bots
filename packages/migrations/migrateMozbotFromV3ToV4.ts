import { Webhook as WebhookFromDb } from '@mozbot.io/prisma'
import {
  BlockV5,
  PublicMozbotV5,
  MozbotV5,
  HttpRequest,
} from '@mozbot.io/schemas'
import { isWebhookBlock } from '@mozbot.io/schemas/helpers'
import { isDefined } from '@mozbot.io/lib/utils'
import prisma from '@mozbot.io/lib/prisma'
import {
  HttpMethod,
  defaultWebhookAttributes,
} from '@mozbot.io/schemas/features/blocks/integrations/webhook/constants'

export const migrateMozbotFromV3ToV4 = async (
  mozbot: MozbotV5 | PublicMozbotV5
): Promise<Omit<MozbotV5 | PublicMozbotV5, 'version'> & { version: '4' }> => {
  if (mozbot.version === '4')
    return mozbot as Omit<MozbotV5, 'version'> & { version: '4' }
  const webhookBlocks = mozbot.groups
    .flatMap((group) => group.blocks)
    .filter(isWebhookBlock)
  const webhooks = await prisma.webhook.findMany({
    where: {
      id: {
        in: webhookBlocks
          .map((block) => ('webhookId' in block ? block.webhookId : undefined))
          .filter(isDefined),
      },
    },
  })
  return {
    ...mozbot,
    version: '4',
    groups: mozbot.groups.map((group) => ({
      ...group,
      blocks: group.blocks.map(migrateWebhookBlock(webhooks)),
    })),
  }
}

const migrateWebhookBlock =
  (webhooks: WebhookFromDb[]) =>
  (block: BlockV5): BlockV5 => {
    if (!isWebhookBlock(block)) return block
    const webhook = webhooks.find((webhook) => webhook.id === block.webhookId)
    return {
      ...block,
      webhookId: undefined,
      options: {
        ...block.options,
        webhook: webhook
          ? {
              id: webhook.id,
              url: webhook.url ?? undefined,
              method:
                (webhook.method as HttpRequest['method']) ?? HttpMethod.POST,
              headers: (webhook.headers as HttpRequest['headers']) ?? [],
              queryParams:
                (webhook.queryParams as HttpRequest['headers']) ?? [],
              body: webhook.body ?? undefined,
            }
          : {
              ...defaultWebhookAttributes,
              id: 'webhookId' in block ? block.webhookId ?? '' : '',
            },
      },
    }
  }
