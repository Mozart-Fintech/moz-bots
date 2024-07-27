import {
  startPreviewChatInputSchema,
  startPreviewChatResponseSchema,
} from '@mozbot.io/schemas/features/chat/schema'
import { publicProcedure } from '@/helpers/server/trpc'
import { startChatPreview as startChatPreviewFn } from '@mozbot.io/bot-engine/apiHandlers/startChatPreview'

export const startChatPreview = publicProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/mozbots/{mozbotId}/preview/startChat',
      summary: 'Iniciar chat de prueba',
      description:
        'Utilice este punto final para probar su bot. Las respuestas no se guardarán. Y se omitirán algunos bloques como "Enviar correo electrónico".',
    },
  })
  .input(startPreviewChatInputSchema)
  .output(startPreviewChatResponseSchema)
  .mutation(
    async ({
      input: {
        message,
        isOnlyRegistering,
        isStreamEnabled,
        startFrom,
        mozbotId,
        mozbot: startMozbot,
        prefilledVariables,
        sessionId,
        textBubbleContentFormat,
      },
      ctx: { user },
    }) =>
      startChatPreviewFn({
        message,
        isOnlyRegistering,
        isStreamEnabled,
        startFrom,
        mozbotId,
        mozbot: startMozbot,
        userId: user?.id,
        prefilledVariables,
        sessionId,
        textBubbleContentFormat,
      })
  )
