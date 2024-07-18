import prisma from '@mozbot.io/lib/prisma'
import { NextApiRequest, NextApiResponse } from 'next'
import { getAuthenticatedUser } from '@/features/auth/helpers/getAuthenticatedUser'
import {
  methodNotAllowed,
  notAuthenticated,
  notFound,
} from '@mozbot.io/lib/api'
import { isReadWorkspaceFobidden } from '@/features/workspace/helpers/isReadWorkspaceFobidden'
import { downloadMedia } from '@mozbot.io/bot-engine/whatsapp/downloadMedia'
import { env } from '@mozbot.io/env'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    if (!env.META_SYSTEM_USER_TOKEN)
      return res
        .status(400)
        .json({ error: 'Meta system user token is not set' })
    const user = await getAuthenticatedUser(req, res)
    if (!user) return notAuthenticated(res)

    const mozbotId = req.query.mozbotId as string

    const mozbot = await prisma.mozbot.findFirst({
      where: {
        id: mozbotId,
      },
      select: {
        whatsAppCredentialsId: true,
        workspace: {
          select: {
            members: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    })

    if (!mozbot?.workspace || isReadWorkspaceFobidden(mozbot.workspace, user))
      return notFound(res, 'Workspace not found')

    if (!mozbot) return notFound(res, 'Mozbot not found')

    const mediaId = req.query.mediaId as string

    const { file, mimeType } = await downloadMedia({
      mediaId,
      systemUserAccessToken: env.META_SYSTEM_USER_TOKEN,
    })

    res.setHeader('Content-Type', mimeType)
    res.setHeader('Cache-Control', 'public, max-age=86400')

    return res.send(file)
  }
  return methodNotAllowed(res)
}

export default handler
