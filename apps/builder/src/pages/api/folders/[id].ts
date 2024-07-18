import { DashboardFolder } from '@mozbot.io/prisma'
import prisma from '@mozbot.io/lib/prisma'
import { NextApiRequest, NextApiResponse } from 'next'
import { methodNotAllowed, notAuthenticated } from '@mozbot.io/lib/api'
import { getAuthenticatedUser } from '@/features/auth/helpers/getAuthenticatedUser'

// TODO: Delete as it has been migrated to TRPC endpoints
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getAuthenticatedUser(req, res)
  if (!user) return notAuthenticated(res)

  const id = req.query.id as string
  if (req.method === 'GET') {
    const folder = await prisma.dashboardFolder.findFirst({
      where: {
        id,
        workspace: { members: { some: { userId: user.id } } },
      },
    })
    return res.send({ folder })
  }
  if (req.method === 'DELETE') {
    const folders = await prisma.dashboardFolder.deleteMany({
      where: { id, workspace: { members: { some: { userId: user.id } } } },
    })
    return res.send({ folders })
  }
  if (req.method === 'PATCH') {
    const data = (
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    ) as Partial<DashboardFolder>
    const folders = await prisma.dashboardFolder.updateMany({
      where: {
        id,
        workspace: { members: { some: { userId: user.id } } },
      },
      data,
    })
    return res.send({ mozbots: folders })
  }
  return methodNotAllowed(res)
}

export default handler
