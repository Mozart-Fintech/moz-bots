import prisma from '@mozbot.io/lib/prisma'
import { NextApiRequest, NextApiResponse } from 'next'
import { canReadMozbots } from '@/helpers/databaseRules'
import { getAuthenticatedUser } from '@/features/auth/helpers/getAuthenticatedUser'
import {
  methodNotAllowed,
  notAuthenticated,
  notFound,
} from '@mozbot.io/lib/api'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getAuthenticatedUser(req, res)
  if (!user) return notAuthenticated(res)
  if (req.method === 'GET') {
    const mozbotId = req.query.mozbotId as string
    const mozbot = await prisma.mozbot.findFirst({
      where: canReadMozbots(mozbotId, user),
      select: { groups: true },
    })
    if (!mozbot) return notFound(res)
    return res.send({ groups: mozbot.groups })
  }
  methodNotAllowed(res)
}

export default handler
