import { publicProcedure } from '@/helpers/server/trpc'
import { whatsAppWebhookRequestBodySchema } from '@mozbot.io/schemas/features/whatsapp'
import { z } from 'zod'
import { isNotDefined } from '@mozbot.io/lib'
import { resumeWhatsAppFlow } from '@mozbot.io/bot-engine/whatsapp/resumeWhatsAppFlow'

export const receiveMessage = publicProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/workspaces/{workspaceId}/whatsapp/{credentialsId}/webhook',
      summary: 'Webhook de mensajes',
      tags: ['WhatsApp'],
    },
  })
  .input(
    z
      .object({ workspaceId: z.string(), credentialsId: z.string() })
      .merge(whatsAppWebhookRequestBodySchema)
  )
  .output(
    z.object({
      message: z.string(),
    })
  )
  .mutation(async ({ input: { entry, credentialsId, workspaceId } }) => {
    const receivedMessage = entry.at(0)?.changes.at(0)?.value.messages?.at(0)
    if (isNotDefined(receivedMessage))
      return { message: 'No se encontró ningún mensaje' }
    const contactName =
      entry.at(0)?.changes.at(0)?.value?.contacts?.at(0)?.profile?.name ?? ''
    const contactPhoneNumber =
      entry.at(0)?.changes.at(0)?.value?.messages?.at(0)?.from ?? ''
    const phoneNumberId = entry.at(0)?.changes.at(0)?.value
      .metadata.phone_number_id
    if (!phoneNumberId)
      return { message: 'No se encontró ningún número de teléfono' }
    return resumeWhatsAppFlow({
      receivedMessage,
      sessionId: `wa-${phoneNumberId}-${receivedMessage.from}`,
      phoneNumberId,
      credentialsId,
      workspaceId,
      contact: {
        name: contactName,
        phoneNumber: contactPhoneNumber,
      },
    })
  })
