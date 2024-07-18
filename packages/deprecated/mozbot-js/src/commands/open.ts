import { openIframe } from '../embedTypes/chat/iframe'
import { openPopup } from '../embedTypes/popup'

export const open = () => {
  const existingPopup = document.querySelector('#mozbot-popup')
  if (existingPopup) openPopup(existingPopup)
  const existingBubble = document.querySelector('#mozbot-bubble')
  if (existingBubble) openIframe(existingBubble)
}
