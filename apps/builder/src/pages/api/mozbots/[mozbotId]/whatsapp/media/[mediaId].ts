import prisma from '@mozbot.io/lib/prisma'
import { NextApiRequest, NextApiResponse } from 'next'
import { getAuthenticatedUser } from '@/features/auth/helpers/getAuthenticatedUser'
import {
  methodNotAllowed,
  notAuthenticated,
  notFound,
} from '@mozbot.io/lib/api'
import { isReadWorkspaceFobidden } from '@/features/workspace/helpers/isReadWorkspaceFobidden'
import { WhatsAppCredentials } from '@mozbot.io/schemas/features/whatsapp'
import { decrypt } from '@mozbot.io/lib/api/encryption/decrypt'
import { downloadMedia } from '@mozbot.io/bot-engine/whatsapp/downloadMedia'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
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
            credentials: {
              where: {
                type: 'whatsApp',
              },
            },
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
    const credentialsId = mozbot.whatsAppCredentialsId

    const credentials = mozbot.workspace.credentials.find(
      (credential) => credential.id === credentialsId
    )

    if (!credentials) return notFound(res, 'Credentials not found')

    const credentialsData = (await decrypt(
      credentials.data,
      credentials.iv
    )) as WhatsAppCredentials['data']

    const { file, mimeType } = await downloadMedia({
      mediaId,
      systemUserAccessToken: credentialsData.systemUserAccessToken,
    })

    res.setHeader('Content-Type', mimeType)
    res.setHeader('Cache-Control', 'public, max-age=86400')

    return res.send(file)
  }
  return methodNotAllowed(res)
}

export default handler
