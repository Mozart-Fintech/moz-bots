import { CommandData } from '../types'

export const toggle = () => {
  const message: CommandData = {
    isFromMozbot: true,
    command: 'toggle',
  }
  window.postMessage(message)
}
