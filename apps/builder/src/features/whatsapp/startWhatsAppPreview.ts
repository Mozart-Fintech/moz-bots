import { authenticatedProcedure } from '@/helpers/server/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { startSession } from '@mozbot.io/bot-engine/startSession'
import { env } from '@mozbot.io/env'
import { HTTPError } from 'ky'
import prisma from '@mozbot.io/lib/prisma'
import { saveStateToDatabase } from '@mozbot.io/bot-engine/saveStateToDatabase'
import { restartSession } from '@mozbot.io/bot-engine/queries/restartSession'
import { sendChatReplyToWhatsApp } from '@mozbot.io/bot-engine/whatsapp/sendChatReplyToWhatsApp'
import { sendWhatsAppMessage } from '@mozbot.io/bot-engine/whatsapp/sendWhatsAppMessage'
import { isReadMozbotForbidden } from '../mozbot/helpers/isReadMozbotForbidden'
import { SessionState, startFromSchema } from '@mozbot.io/schemas'

export const startWhatsAppPreview = authenticatedProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/mozbots/{mozbotId}/whatsapp/start-preview',
      summary: 'Iniciar prueba',
      tags: ['WhatsApp'],
      protect: true,
    },
  })
  .input(
    z.object({
      to: z
        .string()
        .min(1)
        .transform((value) =>
          value.replace(/\s/g, '').replace(/\+/g, '').replace(/-/g, '')
        ),
      mozbotId: z.string(),
      startFrom: startFromSchema.optional(),
    })
  )
  .output(
    z.object({
      message: z.string(),
    })
  )
  .mutation(async ({ input: { to, mozbotId, startFrom }, ctx: { user } }) => {
    if (
      !env.WHATSAPP_PREVIEW_FROM_PHONE_NUMBER_ID ||
      !env.META_SYSTEM_USER_TOKEN ||
      !env.WHATSAPP_PREVIEW_TEMPLATE_NAME
    )
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message:
          'Faltan variables de entorno WHATSAPP_PREVIEW_FROM_PHONE_NUMBER_ID o META_SYSTEM_USER_TOKEN o WHATSAPP_PREVIEW_TEMPLATE_NAME',
      })

    const existingMozbot = await prisma.mozbot.findFirst({
      where: {
        id: mozbotId,
      },
      select: {
        id: true,
        workspace: {
          select: {
            isSuspended: true,
            isPastDue: true,
            members: {
              select: {
                userId: true,
              },
            },
          },
        },
        collaborators: {
          select: {
            userId: true,
          },
        },
      },
    })
    if (
      !existingMozbot?.id ||
      (await isReadMozbotForbidden(existingMozbot, user))
    )
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Mozbot no encontrado',
      })

    const sessionId = `wa-preview-${to}`

    const existingSession = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
      },
      select: {
        updatedAt: true,
        state: true,
      },
    })

    // For users that did not interact with the bot in the last 24 hours, we need to send a template message.
    const canSendDirectMessagesToUser =
      (existingSession?.updatedAt.getTime() ?? 0) >
      Date.now() - 24 * 60 * 60 * 1000

    const {
      newSessionState,
      messages,
      input,
      clientSideActions,
      logs,
      visitedEdges,
      setVariableHistory,
    } = await startSession({
      version: 2,
      startParams: {
        isOnlyRegistering: !canSendDirectMessagesToUser,
        type: 'preview',
        mozbotId,
        startFrom,
        userId: user.id,
        isStreamEnabled: false,
        textBubbleContentFormat: 'richText',
      },
      initialSessionState: {
        whatsApp: (existingSession?.state as SessionState | undefined)
          ?.whatsApp,
      },
    })

    if (canSendDirectMessagesToUser) {
      await sendChatReplyToWhatsApp({
        to,
        typingEmulation: newSessionState.typingEmulation,
        messages,
        input,
        clientSideActions,
        isFirstChatChunk: true,
        credentials: {
          phoneNumberId: env.WHATSAPP_PREVIEW_FROM_PHONE_NUMBER_ID,
          systemUserAccessToken: env.META_SYSTEM_USER_TOKEN,
        },
        state: newSessionState,
      })
      await saveStateToDatabase({
        clientSideActions: [],
        input,
        logs,
        session: {
          id: sessionId,
          state: newSessionState,
        },
        visitedEdges,
        setVariableHistory,
      })
    } else {
      await restartSession({
        state: newSessionState,
        id: sessionId,
      })
      try {
        await sendWhatsAppMessage({
          to,
          message: {
            type: 'template',
            template: {
              language: {
                code: env.WHATSAPP_PREVIEW_TEMPLATE_LANG,
              },
              name: env.WHATSAPP_PREVIEW_TEMPLATE_NAME,
            },
          },
          credentials: {
            phoneNumberId: env.WHATSAPP_PREVIEW_FROM_PHONE_NUMBER_ID,
            systemUserAccessToken: env.META_SYSTEM_USER_TOKEN,
          },
        })
      } catch (err) {
        if (err instanceof HTTPError) console.log(await err.response.text())
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            'Error en la solicitud a Meta para enviar un mensaje de prueba',
          cause: err,
        })
      }
    }
    return {
      message: 'success',
    }
  })
