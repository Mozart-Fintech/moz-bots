import prisma from '@mozbot.io/lib/prisma'
import { NextApiRequest, NextApiResponse } from 'next'
import { canEditGuests } from '@/helpers/databaseRules'
import { getAuthenticatedUser } from '@/features/auth/helpers/getAuthenticatedUser'
import { methodNotAllowed, notAuthenticated } from '@mozbot.io/lib/api'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getAuthenticatedUser(req, res)
  if (!user) return notAuthenticated(res)
  const mozbotId = req.query.mozbotId as string
  const userId = req.query.userId as string
  if (req.method === 'PATCH') {
    const data = req.body
    await prisma.collaboratorsOnMozbots.updateMany({
      where: { userId, mozbot: canEditGuests(user, mozbotId) },
      data: { type: data.type },
    })
    return res.send({
      message: 'success',
    })
  }
  if (req.method === 'DELETE') {
    await prisma.collaboratorsOnMozbots.deleteMany({
      where: { userId, mozbot: canEditGuests(user, mozbotId) },
    })
    return res.send({
      message: 'success',
    })
  }
  methodNotAllowed(res)
}

export default handler
