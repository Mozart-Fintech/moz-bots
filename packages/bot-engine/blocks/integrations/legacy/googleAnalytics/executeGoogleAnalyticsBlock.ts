import { ExecuteIntegrationResponse } from '../../../../types'
import { GoogleAnalyticsBlock, SessionState } from '@mozbot.io/schemas'
import { deepParseVariables } from '@mozbot.io/variables/deepParseVariables'

export const executeGoogleAnalyticsBlock = (
  state: SessionState,
  block: GoogleAnalyticsBlock
): ExecuteIntegrationResponse => {
  const { mozbot, resultId } = state.mozbotsQueue[0]
  if (!resultId || state.whatsApp || !block.options)
    return { outgoingEdgeId: block.outgoingEdgeId }
  const googleAnalytics = deepParseVariables(mozbot.variables, {
    guessCorrectTypes: true,
    removeEmptyStrings: true,
  })(block.options)
  return {
    outgoingEdgeId: block.outgoingEdgeId,
    clientSideActions: [
      {
        type: 'googleAnalytics',
        googleAnalytics,
      },
    ],
  }
}
