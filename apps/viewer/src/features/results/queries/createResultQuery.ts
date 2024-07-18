import { Result } from '@mozbot.io/schemas'
import { sendRequest } from '@mozbot.io/lib'

export const createResultQuery = async (mozbotId: string) => {
  return sendRequest<{ result: Result; hasReachedLimit: boolean }>({
    url: `/api/mozbots/${mozbotId}/results`,
    method: 'POST',
  })
}
