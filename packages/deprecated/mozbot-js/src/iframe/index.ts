import { close } from '../commands'
import { parseQueryParams } from '../commands/setHiddenVariables'
import { MozbotPostMessageData, IframeCallbacks, IframeParams } from '../types'
import './style.css'

export const createIframe = ({
  backgroundColor,
  url,
  ...iframeParams
}: IframeParams): HTMLIFrameElement => {
  const { loadWhenVisible, hiddenVariables } = iframeParams
  const hostUrlParams = new URLSearchParams(document.location.search)
  const hostQueryObj: { [key: string]: string } = {}
  hostUrlParams.forEach((value, key) => {
    hostQueryObj[key] = value
  })
  const iframeUrl = `${url}${parseQueryParams({
    ...hiddenVariables,
    ...hostQueryObj,
  })}`
  const iframe = document.createElement('iframe')
  iframe.setAttribute(loadWhenVisible ? 'data-src' : 'src', iframeUrl)
  iframe.setAttribute('data-id', url)
  const randomThreeLettersId = Math.random().toString(36).substring(7)
  const uniqueId = `${url}-${randomThreeLettersId}`
  iframe.setAttribute('id', uniqueId)
  if (backgroundColor) iframe.style.backgroundColor = backgroundColor
  iframe.classList.add('mozbot-iframe')
  const { onNewVariableValue } = iframeParams
  listenForMozbotMessages({ onNewVariableValue })
  return iframe
}

export const listenForMozbotMessages = (callbacks: IframeCallbacks) => {
  window.addEventListener('message', (event) => {
    const data = event.data as { from?: 'mozbot' } & MozbotPostMessageData
    if (data.from === 'mozbot') processMessage(event.data, callbacks)
  })
}

const processMessage = (
  data: MozbotPostMessageData,
  callbacks: IframeCallbacks
) => {
  if (data.redirectUrl) window.open(data.redirectUrl)
  if (data.newVariableValue && callbacks.onNewVariableValue)
    callbacks.onNewVariableValue(data.newVariableValue)
  if (data.codeToExecute) Function(data.codeToExecute)()
  if (data.closeChatBubble) close()
}
