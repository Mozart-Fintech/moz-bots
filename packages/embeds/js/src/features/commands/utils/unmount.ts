import { CommandData } from '../types'

export const unmount = () => {
  const message: CommandData = {
    isFromMozbot: true,
    command: 'unmount',
  }
  window.postMessage(message)
}
