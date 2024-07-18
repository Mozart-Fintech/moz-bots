import { publicProcedure } from '@/helpers/server/trpc'
import { z } from 'zod'
import { updateMozbotInSession as updateMozbotInSessionFn } from '@mozbot.io/bot-engine/apiHandlers/updateMozbotInSession'

export const updateMozbotInSession = publicProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/sessions/{sessionId}/updateMozbot',
      summary: 'Update mozbot in session',
      description:
        'Update chat session with latest mozbot modifications. This is useful when you want to update the mozbot in an ongoing session after making changes to it.',
      protect: true,
    },
  })
  .input(
    z.object({
      sessionId: z.string(),
    })
  )
  .output(z.object({ message: z.literal('success') }))
  .mutation(({ input: { sessionId }, ctx: { user } }) =>
    updateMozbotInSessionFn({ user, sessionId })
  )
