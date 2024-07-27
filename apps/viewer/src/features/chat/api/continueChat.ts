import { publicProcedure } from '@/helpers/server/trpc'
import {
  continueChatResponseSchema,
  messageSchema,
} from '@mozbot.io/schemas/features/chat/schema'
import { z } from 'zod'
import { continueChat as continueChatFn } from '@mozbot.io/bot-engine/apiHandlers/continueChat'

export const continueChat = publicProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/sessions/{sessionId}/continueChat',
      summary: 'Continuar chat',
    },
  })
  .input(
    z.object({
      message: messageSchema.optional(),
      sessionId: z
        .string()
        .describe(
          'El ID de sesión que obtuvo de la respuesta [startChat](./start-chat).'
        ),
      textBubbleContentFormat: z
        .enum(['richText', 'markdown'])
        .default('richText'),
    })
  )
  .output(continueChatResponseSchema)
  .mutation(
    async ({
      input: { sessionId, message, textBubbleContentFormat },
      ctx: { origin, res },
    }) => {
      const { corsOrigin, ...response } = await continueChatFn({
        origin,
        sessionId,
        message,
        textBubbleContentFormat,
      })
      if (corsOrigin) res.setHeader('Access-Control-Allow-Origin', corsOrigin)
      return response
    }
  )
