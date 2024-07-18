import { Variable, HttpResponse } from '@mozbot.io/schemas'
import { sendRequest } from '@mozbot.io/lib'

export const executeWebhook = (
  mozbotId: string,
  variables: Variable[],
  { blockId }: { blockId: string }
) =>
  sendRequest<HttpResponse>({
    url: `/api/mozbots/${mozbotId}/blocks/${blockId}/testWebhook`,
    method: 'POST',
    body: {
      variables,
    },
  })
