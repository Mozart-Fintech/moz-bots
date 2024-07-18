import { SessionState, ContinueChatResponse } from '@mozbot.io/schemas'
import { parseVariables } from '@mozbot.io/variables/parseVariables'

export const parseDynamicTheme = (
  state: SessionState | undefined
): ContinueChatResponse['dynamicTheme'] => {
  if (!state?.dynamicTheme) return
  return {
    hostAvatarUrl: parseVariables(state?.mozbotsQueue[0].mozbot.variables)(
      state.dynamicTheme.hostAvatarUrl
    ),
    guestAvatarUrl: parseVariables(state?.mozbotsQueue[0].mozbot.variables)(
      state.dynamicTheme.guestAvatarUrl
    ),
  }
}
