import prisma from '@mozbot.io/lib/prisma'
import { Stats } from '@mozbot.io/schemas'
import { NextApiRequest, NextApiResponse } from 'next'
import { canReadMozbots } from '@/helpers/databaseRules'
import { getAuthenticatedUser } from '@/features/auth/helpers/getAuthenticatedUser'
import { methodNotAllowed, notAuthenticated } from '@mozbot.io/lib/api'

// TODO: Delete, as it has been migrated to tRPC
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getAuthenticatedUser(req, res)
  if (!user) return notAuthenticated(res)
  if (req.method === 'GET') {
    const mozbotId = req.query.mozbotId as string

    const mozbot = await prisma.mozbot.findFirst({
      where: canReadMozbots(mozbotId, user),
      select: { id: true },
    })

    if (!mozbot) return res.status(404).send({ message: 'Mozbot not found' })

    const [totalViews, totalStarts, totalCompleted] = await prisma.$transaction(
      [
        prisma.result.count({
          where: {
            mozbotId: mozbot.id,
            isArchived: false,
          },
        }),
        prisma.result.count({
          where: {
            mozbotId: mozbot.id,
            isArchived: false,
            hasStarted: true,
          },
        }),
        prisma.result.count({
          where: {
            mozbotId: mozbot.id,
            isArchived: false,
            isCompleted: true,
          },
        }),
      ]
    )

    const stats: Stats = {
      totalViews,
      totalStarts,
      totalCompleted,
    }
    return res.status(200).send({ stats })
  }
  return methodNotAllowed(res)
}

export default handler
