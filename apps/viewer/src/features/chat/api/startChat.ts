import { publicProcedure } from '@/helpers/server/trpc'
import {
  startChatInputSchema,
  startChatResponseSchema,
} from '@mozbot.io/schemas/features/chat/schema'
import { startChat as startChatFn } from '@mozbot.io/bot-engine/apiHandlers/startChat'

export const startChat = publicProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/mozbots/{publicId}/startChat',
      summary: 'Comenzar chat',
    },
  })
  .input(startChatInputSchema)
  .output(startChatResponseSchema)
  .mutation(async ({ input, ctx: { origin, res } }) => {
    const { corsOrigin, ...response } = await startChatFn({
      ...input,
      origin,
    })
    if (corsOrigin) res.setHeader('Access-Control-Allow-Origin', corsOrigin)
    return response
  })
