import { publicProcedure } from '@/helpers/server/trpc'
import { whatsAppWebhookRequestBodySchema } from '@mozbot.io/schemas/features/whatsapp'
import { z } from 'zod'
import { resumeWhatsAppFlow } from '@mozbot.io/bot-engine/whatsapp/resumeWhatsAppFlow'
import { isNotDefined } from '@mozbot.io/lib'
import { TRPCError } from '@trpc/server'
import { env } from '@mozbot.io/env'

export const receiveMessagePreview = publicProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/whatsapp/preview/webhook',
      summary: 'Webhook de mensajes',
      tags: ['WhatsApp'],
    },
  })
  .input(whatsAppWebhookRequestBodySchema)
  .output(
    z.object({
      message: z.string(),
    })
  )
  .mutation(async ({ input: { entry } }) => {
    if (!env.WHATSAPP_PREVIEW_FROM_PHONE_NUMBER_ID)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'WHATSAPP_PREVIEW_FROM_PHONE_NUMBER_ID no está definido',
      })
    const receivedMessage = entry.at(0)?.changes.at(0)?.value.messages?.at(0)
    if (isNotDefined(receivedMessage))
      return { message: 'No se encontró ningún mensaje' }
    const contactName =
      entry.at(0)?.changes.at(0)?.value?.contacts?.at(0)?.profile?.name ?? ''
    const contactPhoneNumber =
      entry.at(0)?.changes.at(0)?.value?.messages?.at(0)?.from ?? ''
    return resumeWhatsAppFlow({
      receivedMessage,
      sessionId: `wa-preview-${receivedMessage.from}`,
      contact: {
        name: contactName,
        phoneNumber: contactPhoneNumber,
      },
    })
  })
