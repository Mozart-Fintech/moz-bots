import { sendRequest } from '@mozbot.io/lib'

export const deleteMemberQuery = (workspaceId: string, userId: string) =>
  sendRequest({
    method: 'DELETE',
    url: `/api/workspaces/${workspaceId}/members/${userId}`,
  })
