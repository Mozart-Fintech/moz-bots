import prisma from '@mozbot.io/lib/prisma'
import { NextApiRequest, NextApiResponse } from 'next'
import { getAuthenticatedUser } from '@/features/auth/helpers/getAuthenticatedUser'
import {
  badRequest,
  methodNotAllowed,
  notAuthenticated,
  notFound,
} from '@mozbot.io/lib/api'
import { getFileTempUrl } from '@mozbot.io/lib/s3/getFileTempUrl'
import { isReadMozbotForbidden } from '@/features/mozbot/helpers/isReadMozbotForbidden'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const user = await getAuthenticatedUser(req, res)
    if (!user) return notAuthenticated(res)

    const mozbotId = req.query.mozbotId as string
    const resultId = req.query.resultId as string
    const fileName = req.query.fileName as string

    if (!fileName) return badRequest(res, 'fileName missing not found')

    const mozbot = await prisma.mozbot.findFirst({
      where: {
        id: mozbotId,
      },
      select: {
        whatsAppCredentialsId: true,
        collaborators: {
          select: {
            userId: true,
          },
        },
        workspace: {
          select: {
            id: true,
            isSuspended: true,
            isPastDue: true,
            members: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    })

    if (!mozbot?.workspace || (await isReadMozbotForbidden(mozbot, user)))
      return notFound(res, 'Workspace not found')

    if (!mozbot) return notFound(res, 'Mozbot not found')

    const tmpUrl = await getFileTempUrl({
      key: `private/workspaces/${mozbot.workspace.id}/mozbots/${mozbotId}/results/${resultId}/${fileName}`,
    })

    if (!tmpUrl) return notFound(res, 'File not found')

    return res.redirect(tmpUrl)
  }
  return methodNotAllowed(res)
}

export default handler
