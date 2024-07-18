import { sendRequest } from '@mozbot.io/lib'

export const deleteCollaboratorQuery = (mozbotId: string, userId: string) =>
  sendRequest({
    method: 'DELETE',
    url: `/api/mozbots/${mozbotId}/collaborators/${userId}`,
  })
