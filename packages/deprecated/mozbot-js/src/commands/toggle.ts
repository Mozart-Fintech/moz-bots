import {
  closeIframe,
  isIframeOpened,
  openIframe,
} from '../embedTypes/chat/iframe'
import { closePopup, isPopupOpened, openPopup } from '../embedTypes/popup'

export const toggle = () => {
  const existingPopup = document.querySelector('#mozbot-popup')
  if (existingPopup)
    isPopupOpened(existingPopup)
      ? closePopup(existingPopup)
      : openPopup(existingPopup)
  const existingBubble = document.querySelector('#mozbot-bubble')
  if (existingBubble)
    isIframeOpened(existingBubble)
      ? closeIframe(existingBubble)
      : openIframe(existingBubble)
}
