import { CollaboratorsOnMozbots } from '@mozbot.io/prisma'
import { sendRequest } from '@mozbot.io/lib'

export const updateCollaboratorQuery = (
  mozbotId: string,
  userId: string,
  collaborator: Omit<CollaboratorsOnMozbots, 'createdAt' | 'updatedAt'>
) =>
  sendRequest({
    method: 'PATCH',
    url: `/api/mozbots/${mozbotId}/collaborators/${userId}`,
    body: collaborator,
  })
