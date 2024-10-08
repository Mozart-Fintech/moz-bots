import { CommandData } from '../types'

export const setPrefilledVariables = (
  variables: Record<string, string | number | boolean>
) => {
  const message: CommandData = {
    isFromMozbot: true,
    command: 'setPrefilledVariables',
    variables,
  }
  window.postMessage(message)
}
