import { LinkedMozbot } from '@/providers/MozbotProvider'
import { LogicState } from '@/types'
import { MozbotLinkBlock, Mozbot, PublicMozbot } from '@mozbot.io/schemas'
import { sendRequest } from '@mozbot.io/lib'

export const fetchAndInjectMozbot = async (
  block: MozbotLinkBlock,
  { apiHost, injectLinkedMozbot, isPreview }: LogicState
): Promise<LinkedMozbot | undefined> => {
  const { data, error } = isPreview
    ? await sendRequest<{ mozbot: Mozbot }>(
        `/api/mozbots/${block.options?.mozbotId}`
      )
    : await sendRequest<{ mozbot: PublicMozbot }>(
        `${apiHost}/api/publicMozbots/${block.options?.mozbotId}`
      )
  if (!data || error) return
  return injectLinkedMozbot(data.mozbot)
}
