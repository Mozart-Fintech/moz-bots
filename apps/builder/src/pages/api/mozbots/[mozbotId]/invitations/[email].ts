import { Invitation } from '@mozbot.io/prisma'
import prisma from '@mozbot.io/lib/prisma'
import { NextApiRequest, NextApiResponse } from 'next'
import { canEditGuests } from '@/helpers/databaseRules'
import { getAuthenticatedUser } from '@/features/auth/helpers/getAuthenticatedUser'
import { methodNotAllowed, notAuthenticated } from '@mozbot.io/lib/api'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getAuthenticatedUser(req, res)
  if (!user) return notAuthenticated(res)
  const mozbotId = req.query.mozbotId as string
  const email = req.query.email as string
  if (req.method === 'PATCH') {
    const data = req.body as Invitation
    await prisma.invitation.updateMany({
      where: { email, mozbot: canEditGuests(user, mozbotId) },
      data: { type: data.type },
    })
    return res.send({
      message: 'success',
    })
  }
  if (req.method === 'DELETE') {
    await prisma.invitation.deleteMany({
      where: {
        email,
        mozbot: canEditGuests(user, mozbotId),
      },
    })
    return res.send({
      message: 'success',
    })
  }
  methodNotAllowed(res)
}

export default handler
