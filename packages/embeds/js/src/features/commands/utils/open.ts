import { CommandData } from '../types'

export const open = () => {
  const message: CommandData = {
    isFromMozbot: true,
    command: 'open',
  }
  window.postMessage(message)
}
