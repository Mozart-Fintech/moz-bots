import { sendRequest } from '@mozbot.io/lib'
import { User } from '@mozbot.io/schemas'

export const updateUserQuery = async (id: string, user: Partial<User>) =>
  sendRequest({
    url: `/api/users/${id}`,
    method: 'PATCH',
    body: user,
  })
