import { authenticateUser } from '@/helpers/authenticateUser'
import prisma from '@mozbot.io/lib/prisma'
import { NextApiRequest, NextApiResponse } from 'next'
import { methodNotAllowed } from '@mozbot.io/lib/api'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const user = await authenticateUser(req)
    if (!user) return res.status(401).json({ message: 'Not authenticated' })
    const mozbots = await prisma.mozbot.findMany({
      where: {
        workspace: { members: { some: { userId: user.id } } },
        isArchived: { not: true },
      },
      select: {
        name: true,
        publishedMozbot: { select: { id: true } },
        id: true,
      },
    })
    return res.send({
      mozbots: mozbots.map((mozbot) => ({
        id: mozbot.id,
        name: mozbot.name,
        publishedmozbotId: mozbot.publishedMozbot?.id,
      })),
    })
  }
  return methodNotAllowed(res)
}

export default handler
