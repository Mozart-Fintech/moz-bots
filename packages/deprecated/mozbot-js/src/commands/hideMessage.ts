import { closeProactiveMessage } from '../embedTypes/chat/proactiveMessage'

export const hideMessage = () => {
  const existingBubble = document.querySelector('#mozbot-bubble')
  if (existingBubble) closeProactiveMessage(existingBubble)
}
