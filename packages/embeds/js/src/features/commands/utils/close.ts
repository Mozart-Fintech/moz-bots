import { CommandData } from '../types'

export const close = () => {
  const message: CommandData = {
    isFromMozbot: true,
    command: 'close',
  }
  window.postMessage(message)
}
