import { stringify } from 'qs'
import { sendRequest } from '@mozbot.io/lib'

export const createSheetsCredentialQuery = async (code: string) => {
  const queryParams = stringify({ code })
  return sendRequest({
    url: `/api/credentials/google-sheets/callback?${queryParams}`,
    method: 'GET',
  })
}
