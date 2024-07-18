import { CommandData } from '../types'

export const hidePreviewMessage = () => {
  const message: CommandData = {
    isFromMozbot: true,
    command: 'hidePreviewMessage',
  }
  window.postMessage(message)
}
