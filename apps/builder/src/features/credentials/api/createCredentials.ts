import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { smtpCredentialsSchema } from '@mozbot.io/schemas/features/blocks/integrations/sendEmail'
import { encrypt } from '@mozbot.io/lib/api/encryption/encrypt'
import { z } from 'zod'
import { whatsAppCredentialsSchema } from '@mozbot.io/schemas/features/whatsapp'
import {
  Credentials,
  googleSheetsCredentialsSchema,
  stripeCredentialsSchema,
} from '@mozbot.io/schemas'
import { isDefined } from '@mozbot.io/lib/utils'
import { isWriteWorkspaceForbidden } from '@/features/workspace/helpers/isWriteWorkspaceForbidden'
import { trackEvents } from '@mozbot.io/telemetry/trackEvents'
import { forgedCredentialsSchemas } from '@mozbot.io/forge-repository/credentials'

const inputShape = {
  data: true,
  type: true,
  workspaceId: true,
  name: true,
} as const

export const createCredentials = authenticatedProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/credentials',
      protect: true,
      summary: 'Crear credenciales',
      tags: ['Credentials'],
    },
  })
  .input(
    z.object({
      credentials: z
        .discriminatedUnion('type', [
          stripeCredentialsSchema.pick(inputShape),
          smtpCredentialsSchema.pick(inputShape),
          googleSheetsCredentialsSchema.pick(inputShape),
          whatsAppCredentialsSchema.pick(inputShape),
          ...Object.values(forgedCredentialsSchemas).map((i) =>
            i.pick(inputShape)
          ),
        ])
        .and(z.object({ id: z.string().cuid2().optional() })),
    })
  )
  .output(
    z.object({
      credentialsId: z.string(),
    })
  )
  .mutation(async ({ input: { credentials }, ctx: { user } }) => {
    if (
      await isNotAvailable(
        credentials.name,
        credentials.type as Credentials['type']
      )
    )
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Las credenciales ya existen.',
      })
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: credentials.workspaceId,
      },
      select: { id: true, members: { select: { userId: true, role: true } } },
    })
    if (!workspace || isWriteWorkspaceForbidden(workspace, user))
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Espacio de trabajo no encontrado',
      })

    const { encryptedData, iv } = await encrypt(credentials.data)
    const createdCredentials = await prisma.credentials.create({
      data: {
        ...credentials,
        data: encryptedData,
        iv,
      },
      select: {
        id: true,
      },
    })
    if (credentials.type === 'whatsApp')
      await trackEvents([
        {
          workspaceId: workspace.id,
          userId: user.id,
          name: 'WhatsApp credentials created',
        },
      ])
    return { credentialsId: createdCredentials.id }
  })

const isNotAvailable = async (name: string, type: Credentials['type']) => {
  if (type !== 'whatsApp') return
  const existingCredentials = await prisma.credentials.findFirst({
    where: {
      type,
      name,
    },
  })
  return isDefined(existingCredentials)
}
