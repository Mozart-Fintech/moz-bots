import { CollaborationType, WorkspaceRole } from '@mozbot.io/prisma'
import prisma from '@mozbot.io/lib/prisma'
import { NextApiRequest, NextApiResponse } from 'next'
import {
  canReadMozbots,
  canWriteMozbots,
  isUniqueConstraintError,
} from '@/helpers/databaseRules'
import {
  badRequest,
  forbidden,
  methodNotAllowed,
  notAuthenticated,
} from '@mozbot.io/lib/api'
import { getAuthenticatedUser } from '@/features/auth/helpers/getAuthenticatedUser'
import { sendGuestInvitationEmail } from '@mozbot.io/emails'
import { env } from '@mozbot.io/env'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getAuthenticatedUser(req, res)
  if (!user) return notAuthenticated(res)
  const mozbotId = req.query.mozbotId as string | undefined
  if (!mozbotId) return badRequest(res)
  if (req.method === 'GET') {
    const invitations = await prisma.invitation.findMany({
      where: { mozbotId, mozbot: canReadMozbots(mozbotId, user) },
    })
    return res.send({
      invitations,
    })
  }
  if (req.method === 'POST') {
    const mozbot = await prisma.mozbot.findFirst({
      where: canWriteMozbots(mozbotId, user),
      include: { workspace: { select: { name: true } } },
    })
    if (!mozbot || !mozbot.workspaceId) return forbidden(res)
    const { email, type } =
      (req.body as
        | { email: string | undefined; type: CollaborationType | undefined }
        | undefined) ?? {}
    if (!email || !type) return badRequest(res)
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    })
    if (existingUser) {
      try {
        await prisma.collaboratorsOnMozbots.create({
          data: {
            type,
            mozbotId,
            userId: existingUser.id,
          },
        })
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          return res.status(400).send({
            message: 'User already has access to this mozbot.',
          })
        }
        throw error
      }

      await prisma.memberInWorkspace.upsert({
        where: {
          userId_workspaceId: {
            userId: existingUser.id,
            workspaceId: mozbot.workspaceId,
          },
        },
        create: {
          role: WorkspaceRole.GUEST,
          userId: existingUser.id,
          workspaceId: mozbot.workspaceId,
        },
        update: {},
      })
    } else
      await prisma.invitation.create({
        data: { email: email.toLowerCase().trim(), type, mozbotId },
      })
    if (!env.NEXT_PUBLIC_E2E_TEST)
      await sendGuestInvitationEmail({
        to: email,
        hostEmail: user.email ?? '',
        url: `${env.NEXTAUTH_URL}/mozbots?workspaceId=${mozbot.workspaceId}`,
        guestEmail: email.toLowerCase(),
        mozbotName: mozbot.name,
        workspaceName: mozbot.workspace?.name ?? '',
      })
    return res.send({
      message: 'success',
    })
  }
  methodNotAllowed(res)
}

export default handler
