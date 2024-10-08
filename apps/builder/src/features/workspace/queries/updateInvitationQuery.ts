import { WorkspaceInvitation } from '@mozbot.io/prisma'
import { sendRequest } from '@mozbot.io/lib'

export const updateInvitationQuery = (
  invitation: Partial<WorkspaceInvitation>
) =>
  sendRequest({
    url: `/api/workspaces/${invitation.workspaceId}/invitations/${invitation.id}`,
    method: 'PATCH',
    body: invitation,
  })
