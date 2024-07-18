import { sendRequest } from '@mozbot.io/lib'

export const deleteInvitationQuery = (mozbotId: string, email: string) =>
  sendRequest({
    method: 'DELETE',
    url: `/api/mozbots/${mozbotId}/invitations/${email}`,
  })
