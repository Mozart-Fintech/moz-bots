import prisma from '@mozbot.io/lib/prisma'
import { NextApiRequest, NextApiResponse } from 'next'
import Cors from 'cors'
import { initMiddleware, methodNotAllowed, notFound } from '@mozbot.io/lib/api'

const cors = initMiddleware(Cors())

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  await cors(req, res)
  if (req.method === 'GET') {
    const mozbotId = req.query.mozbotId as string
    const mozbot = await prisma.publicMozbot.findUnique({
      where: { mozbotId },
    })
    if (!mozbot) return notFound(res)
    return res.send({ mozbot })
  }
  methodNotAllowed(res)
}

export default handler
