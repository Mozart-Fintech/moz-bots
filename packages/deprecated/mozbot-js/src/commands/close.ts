import { closeIframe } from '../embedTypes/chat/iframe'
import { closePopup } from '../embedTypes/popup'

export const close = () => {
  const existingPopup = document.querySelector('#mozbot-popup')
  if (existingPopup) closePopup(existingPopup)
  const existingBubble = document.querySelector('#mozbot-bubble')
  if (existingBubble) closeIframe(existingBubble)
}
