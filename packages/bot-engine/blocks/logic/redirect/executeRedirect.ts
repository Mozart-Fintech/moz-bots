import { RedirectBlock, SessionState } from '@mozbot.io/schemas'
import { sanitizeUrl } from '@mozbot.io/lib'
import { ExecuteLogicResponse } from '../../../types'
import { parseVariables } from '@mozbot.io/variables/parseVariables'

export const executeRedirect = (
  state: SessionState,
  block: RedirectBlock
): ExecuteLogicResponse => {
  const { variables } = state.mozbotsQueue[0].mozbot
  if (!block.options?.url) return { outgoingEdgeId: block.outgoingEdgeId }
  const formattedUrl = sanitizeUrl(parseVariables(variables)(block.options.url))
  return {
    clientSideActions: [
      {
        type: 'redirect',
        redirect: { url: formattedUrl, isNewTab: block.options.isNewTab },
      },
    ],
    outgoingEdgeId: block.outgoingEdgeId,
  }
}
