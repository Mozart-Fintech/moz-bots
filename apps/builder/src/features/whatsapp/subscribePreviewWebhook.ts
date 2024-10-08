import { publicProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { env } from '@mozbot.io/env'
import { z } from 'zod'

export const subscribePreviewWebhook = publicProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/whatsapp/preview/webhook',
      summary: 'Suscribir webhook',
      tags: ['WhatsApp'],
    },
  })
  .input(
    z.object({
      'hub.challenge': z.string(),
      'hub.verify_token': z.string(),
    })
  )
  .output(z.number())
  .query(
    async ({
      input: { 'hub.challenge': challenge, 'hub.verify_token': token },
    }) => {
      if (token !== env.ENCRYPTION_SECRET)
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No autorizado' })
      return Number(challenge)
    }
  )
