import { CollaborationType } from '@mozbot.io/prisma'
import { sendRequest } from '@mozbot.io/lib'

export const sendInvitationQuery = (
  mozbotId: string,
  { email, type }: { email: string; type: CollaborationType }
) =>
  sendRequest({
    method: 'POST',
    url: `/api/mozbots/${mozbotId}/invitations`,
    body: { email, type },
  })
