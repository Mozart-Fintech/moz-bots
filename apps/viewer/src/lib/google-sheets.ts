import { Credentials as CredentialsFromDb } from '@mozbot.io/prisma'
import { OAuth2Client, Credentials } from 'google-auth-library'
import { GoogleSheetsCredentials } from '@mozbot.io/schemas'
import { isDefined } from '@mozbot.io/lib'
import { env } from '@mozbot.io/env'
import prisma from '@mozbot.io/lib/prisma'
import { decrypt } from '@mozbot.io/lib/api/encryption/decrypt'
import { encrypt } from '@mozbot.io/lib/api/encryption/encrypt'

export const getAuthenticatedGoogleClient = async (
  credentialsId: string
): Promise<OAuth2Client | undefined> => {
  const credentials = (await prisma.credentials.findFirst({
    where: { id: credentialsId },
  })) as CredentialsFromDb | undefined
  if (!credentials) return
  const data = (await decrypt(
    credentials.data,
    credentials.iv
  )) as GoogleSheetsCredentials['data']

  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${env.NEXTAUTH_URL}/api/credentials/google-sheets/callback`
  )
  oauth2Client.setCredentials(data)
  oauth2Client.on('tokens', updateTokens(credentialsId, data))
  return oauth2Client
}

const updateTokens =
  (
    credentialsId: string,
    existingCredentials: GoogleSheetsCredentials['data']
  ) =>
  async (credentials: Credentials) => {
    if (
      isDefined(existingCredentials.id_token) &&
      credentials.id_token !== existingCredentials.id_token
    )
      return
    const newCredentials: GoogleSheetsCredentials['data'] = {
      ...existingCredentials,
      expiry_date: credentials.expiry_date,
      access_token: credentials.access_token,
    }
    const { encryptedData, iv } = await encrypt(newCredentials)
    await prisma.credentials.updateMany({
      where: { id: credentialsId },
      data: { data: encryptedData, iv },
    })
  }
