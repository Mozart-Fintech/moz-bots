import { authenticateUser } from '@/helpers/authenticateUser'
import prisma from '@mozbot.io/lib/prisma'
import { ResultWithAnswers } from '@mozbot.io/schemas'
import { NextApiRequest, NextApiResponse } from 'next'
import { methodNotAllowed } from '@mozbot.io/lib/api'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const user = await authenticateUser(req)
    if (!user) return res.status(401).json({ message: 'Not authenticated' })
    const mozbotId = req.query.mozbotId as string
    const limit = Number(req.query.limit)
    const results = (await prisma.result.findMany({
      where: {
        mozbot: {
          id: mozbotId,
          workspace: { members: { some: { userId: user.id } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { answers: true },
    })) as unknown as ResultWithAnswers[]
    return res.send({ results })
  }
  if (req.method === 'POST') {
    const mozbotId = req.query.mozbotId as string
    const mozbot = await prisma.mozbot.findFirst({
      where: { id: mozbotId },
      select: { workspace: { select: { isQuarantined: true } } },
    })
    if (mozbot?.workspace.isQuarantined)
      return res.send({ result: null, hasReachedLimit: true })
    const result = await prisma.result.create({
      data: {
        mozbotId,
        isCompleted: false,
        variables: [],
      },
    })
    res.send({ result })
    return
  }
  methodNotAllowed(res)
}

export default handler
