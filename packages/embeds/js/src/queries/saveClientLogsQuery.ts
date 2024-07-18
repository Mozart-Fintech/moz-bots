import { guessApiHost } from '@/utils/guessApiHost'
import type { ChatLog } from '@mozbot.io/schemas'
import { isNotEmpty } from '@mozbot.io/lib'
import ky from 'ky'

export const saveClientLogsQuery = async ({
  apiHost,
  sessionId,
  clientLogs,
}: {
  apiHost?: string
  sessionId: string
  clientLogs: ChatLog[]
}) => {
  try {
    await ky.post(
      `${
        isNotEmpty(apiHost) ? apiHost : guessApiHost()
      }/api/v1/sessions/${sessionId}/clientLogs`,
      {
        json: {
          clientLogs,
        },
      }
    )
  } catch (e) {
    console.log(e)
  }
}
