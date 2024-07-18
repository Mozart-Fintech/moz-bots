import { Invitation, PrismaClient, WorkspaceRole } from '@mozbot.io/prisma'

export type InvitationWithWorkspaceId = Invitation & {
  mozbot: {
    workspaceId: string | null
  }
}

export const convertInvitationsToCollaborations = async (
  p: PrismaClient,
  { id, email }: { id: string; email: string },
  invitations: InvitationWithWorkspaceId[]
) => {
  await p.collaboratorsOnMozbots.createMany({
    data: invitations.map((invitation) => ({
      mozbotId: invitation.mozbotId,
      type: invitation.type,
      userId: id,
    })),
  })
  const workspaceInvitations = invitations.reduce<InvitationWithWorkspaceId[]>(
    (acc, invitation) =>
      acc.some(
        (inv) => inv.mozbot.workspaceId === invitation.mozbot.workspaceId
      )
        ? acc
        : [...acc, invitation],
    []
  )
  for (const invitation of workspaceInvitations) {
    if (!invitation.mozbot.workspaceId) continue
    await p.memberInWorkspace.createMany({
      data: [
        {
          userId: id,
          workspaceId: invitation.mozbot.workspaceId,
          role: WorkspaceRole.GUEST,
        },
      ],
      skipDuplicates: true,
    })
  }
  return p.invitation.deleteMany({
    where: {
      email,
    },
  })
}
