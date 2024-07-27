import { publicProcedure } from '@/helpers/server/trpc'
import { z } from 'zod'
import { updateMozbotInSession as updateMozbotInSessionFn } from '@mozbot.io/bot-engine/apiHandlers/updateMozbotInSession'

export const updateMozbotInSession = publicProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/sessions/{sessionId}/updateMozbot',
      summary: 'Actualizar mozbot en sesión',
      description:
        'Actualice la sesión de chat con las últimas modificaciones de mozbot. Esto es útil cuando desea actualizar el mozbot en una sesión en curso después de realizar cambios.',
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
