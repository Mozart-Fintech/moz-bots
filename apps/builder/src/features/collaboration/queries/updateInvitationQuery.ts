import { Invitation } from '@mozbot.io/prisma'
import { sendRequest } from '@mozbot.io/lib'

export const updateInvitationQuery = (
  mozbotId: string,
  email: string,
  invitation: Omit<Invitation, 'createdAt' | 'id' | 'updatedAt'>
) =>
  sendRequest({
    method: 'PATCH',
    url: `/api/mozbots/${mozbotId}/invitations/${email}`,
    body: invitation,
  })
