import { authenticatedProcedure } from '@/helpers/server/trpc'
import { z } from 'zod'
import ky from 'ky'
import { TRPCError } from '@trpc/server'
import { WhatsAppCredentials } from '@mozbot.io/schemas/features/whatsapp'
import prisma from '@mozbot.io/lib/prisma'
import { decrypt } from '@mozbot.io/lib/api/encryption/decrypt'
import { env } from '@mozbot.io/env'

const inputSchema = z.object({
  token: z.string().optional(),
  credentialsId: z.string().optional(),
})

export const getSystemTokenInfo = authenticatedProcedure
  .input(inputSchema)
  .query(async ({ input, ctx: { user } }) => {
    if (!input.token && !input.credentialsId)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Se debe proporcionar el token o el ID de credenciales',
      })
    const credentials = await getCredentials(user.id, input)
    if (!credentials)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Credenciales no encontradas',
      })
    const {
      data: { expires_at, scopes, app_id, application },
    } = await ky
      .get(
        `${env.WHATSAPP_CLOUD_API_URL}/v17.0/debug_token?input_token=${credentials.systemUserAccessToken}`,
        {
          headers: {
            Authorization: `Bearer ${credentials.systemUserAccessToken}`,
          },
        }
      )
      .json<{
        data: {
          app_id: string
          application: string
          expires_at: number
          scopes: string[]
        }
      }>()

    return {
      appId: app_id,
      appName: application,
      expiresAt: expires_at,
      scopes,
    }
  })

const getCredentials = async (
  userId: string,
  input: z.infer<typeof inputSchema>
): Promise<Omit<WhatsAppCredentials['data'], 'phoneNumberId'> | undefined> => {
  if (input.token)
    return {
      systemUserAccessToken: input.token,
    }
  const credentials = await prisma.credentials.findUnique({
    where: {
      id: input.credentialsId,
      workspace: { members: { some: { userId } } },
    },
  })
  if (!credentials) return
  return (await decrypt(
    credentials.data,
    credentials.iv
  )) as WhatsAppCredentials['data']
}
