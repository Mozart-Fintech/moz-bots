import { authenticateUser } from '@/helpers/authenticateUser'
import prisma from '@mozbot.io/lib/prisma'
import { Group, HttpRequestBlock } from '@mozbot.io/schemas'
import { NextApiRequest, NextApiResponse } from 'next'
import { isWebhookBlock } from '@mozbot.io/schemas/helpers'
import { methodNotAllowed } from '@mozbot.io/lib/api'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const user = await authenticateUser(req)
    if (!user) return res.status(401).json({ message: 'Not authenticated' })
    const mozbotId = req.query.mozbotId as string
    const mozbot = await prisma.mozbot.findFirst({
      where: {
        id: mozbotId,
        workspace: { members: { some: { userId: user.id } } },
      },
      select: { groups: true, webhooks: true },
    })
    const emptyWebhookBlocks = (mozbot?.groups as Group[]).reduce<
      { blockId: string; name: string; url: string | undefined }[]
    >((emptyWebhookBlocks, group) => {
      const blocks = group.blocks.filter((block) =>
        isWebhookBlock(block)
      ) as HttpRequestBlock[]
      return [
        ...emptyWebhookBlocks,
        ...blocks.map((b) => ({
          blockId: b.id,
          name: `${group.title} > ${b.id}`,
          url:
            mozbot?.webhooks.find((w) => {
              if ('id' in w && 'webhookId' in b) return w.id === b.webhookId
              return false
            })?.url ?? undefined,
        })),
      ]
    }, [])
    return res.send({ blocks: emptyWebhookBlocks })
  }
  return methodNotAllowed(res)
}

export default handler
