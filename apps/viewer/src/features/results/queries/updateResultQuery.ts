import { Result } from '@mozbot.io/schemas'
import { sendRequest } from '@mozbot.io/lib'

export const updateResultQuery = async (
  resultId: string,
  result: Partial<Result>
) =>
  sendRequest<Result>({
    url: `/api/mozbots/t/results/${resultId}`,
    method: 'PATCH',
    body: result,
  })
