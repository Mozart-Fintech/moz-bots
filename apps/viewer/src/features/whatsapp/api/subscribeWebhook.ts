import { publicProcedure } from '@/helpers/server/trpc'
import prisma from '@mozbot.io/lib/prisma'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const subscribeWebhook = publicProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/workspaces/{workspaceId}/whatsapp/{credentialsId}/webhook',
      summary: 'Suscribir webhook',
      tags: ['WhatsApp'],
      protect: true,
    },
  })
  .input(
    z.object({
      workspaceId: z.string(),
      credentialsId: z.string(),
      'hub.challenge': z.string(),
      'hub.verify_token': z.string(),
    })
  )
  .output(z.number())
  .query(
    async ({
      input: { 'hub.challenge': challenge, 'hub.verify_token': token },
    }) => {
      const verificationToken = await prisma.verificationToken.findUnique({
        where: {
          token,
        },
      })
      if (!verificationToken)
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'No autorizado',
        })
      await prisma.verificationToken.delete({
        where: {
          token,
        },
      })
      return Number(challenge)
    }
  )
