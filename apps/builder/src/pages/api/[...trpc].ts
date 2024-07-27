import { createContext } from '@/helpers/server/context'
import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'
import { createOpenApiNextHandler } from '@lilyrose2798/trpc-openapi'
import cors from 'nextjs-cors'
import { publicRouter } from '@/helpers/server/routers/publicRouter'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  await cors(req, res, {
    origin: ['https://mozdocs.mozartfintech.com', 'http://localhost:3000'],
  })

  return createOpenApiNextHandler({
    router: publicRouter,
    createContext,
    onError({ error }) {
      if (error.code === 'INTERNAL_SERVER_ERROR') {
        Sentry.captureException(error)
        console.error('Algo salió mal', error)
      }
    },
  })(req, res)
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
}

export default handler
