import { openProactiveMessage } from '../embedTypes/chat/proactiveMessage'

export const showMessage = () => {
  const existingBubble = document.querySelector('#mozbot-bubble')
  if (existingBubble) openProactiveMessage(existingBubble)
}
