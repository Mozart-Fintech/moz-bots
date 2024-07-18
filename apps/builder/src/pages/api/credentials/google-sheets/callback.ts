import { NextApiRequest, NextApiResponse } from 'next'
import { Prisma } from '@mozbot.io/prisma'
import prisma from '@mozbot.io/lib/prisma'
import { googleSheetsScopes } from './consent-url'
import { badRequest, notAuthenticated } from '@mozbot.io/lib/api'
import { getAuthenticatedUser } from '@/features/auth/helpers/getAuthenticatedUser'
import { env } from '@mozbot.io/env'
import { encrypt } from '@mozbot.io/lib/api/encryption/encrypt'
import { OAuth2Client } from 'google-auth-library'
import { parseGroups } from '@mozbot.io/schemas'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getAuthenticatedUser(req, res)
  if (!user) return notAuthenticated(res)
  const state = req.query.state as string | undefined
  if (!state) return badRequest(res)
  const { mozbotId, redirectUrl, blockId, workspaceId } = JSON.parse(
    Buffer.from(state, 'base64').toString()
  ) as {
    redirectUrl: string
    workspaceId: string
    mozbotId?: string
    blockId?: string
  }
  if (req.method === 'GET') {
    const code = req.query.code as string | undefined
    if (!workspaceId) return badRequest(res)
    if (!code)
      return res.status(400).send({ message: "Bad request, couldn't get code" })
    const oauth2Client = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      `${env.NEXTAUTH_URL}/api/credentials/google-sheets/callback`
    )
    const { tokens } = await oauth2Client.getToken(code)
    if (!tokens?.access_token) {
      console.error('Error getting oAuth tokens:')
      throw new Error('ERROR')
    }
    oauth2Client.setCredentials(tokens)
    const { email, scopes } = await oauth2Client.getTokenInfo(
      tokens.access_token
    )
    if (!email)
      return res
        .status(400)
        .send({ message: "Couldn't get email from getTokenInfo" })
    if (googleSheetsScopes.some((scope) => !scopes.includes(scope)))
      return res
        .status(400)
        .send({ message: "User didn't accepted required scopes" })
    const { encryptedData, iv } = await encrypt(tokens)
    const credentials = {
      name: email,
      type: 'google sheets',
      workspaceId,
      data: encryptedData,
      iv,
    } satisfies Prisma.CredentialsUncheckedCreateInput
    const { id: credentialsId } = await prisma.credentials.create({
      data: credentials,
    })
    if (!mozbotId) return res.redirect(`${redirectUrl.split('?')[0]}`)
    const mozbot = await prisma.mozbot.findFirst({
      where: {
        id: mozbotId,
      },
      select: {
        version: true,
        groups: true,
      },
    })
    if (!mozbot) return res.status(404).send({ message: 'Mozbot not found' })
    const groups = parseGroups(mozbot.groups, {
      mozbotVersion: mozbot.version,
    }).map((group) => {
      const block = group.blocks.find((block) => block.id === blockId)
      if (!block) return group
      return {
        ...group,
        blocks: group.blocks.map((block) => {
          if (block.id !== blockId) return block
          return {
            ...block,
            options:
              'options' in block
                ? { ...block.options, credentialsId }
                : {
                    credentialsId,
                  },
          }
        }),
      }
    })
    await prisma.mozbot.updateMany({
      where: {
        id: mozbotId,
      },
      data: {
        groups,
      },
    })
    res.redirect(
      `${redirectUrl.split('?')[0]}?blockId=${blockId}` ?? `${env.NEXTAUTH_URL}`
    )
  }
}

export default handler
