import { StartChatResponse } from '@mozbot.io/schemas'

export const setPaymentInProgressInStorage = (
  state: Pick<StartChatResponse, 'mozbot' | 'sessionId' | 'resultId'>
) => {
  sessionStorage.setItem('mozbotPaymentInProgress', JSON.stringify(state))
}

export const getPaymentInProgressInStorage = () =>
  sessionStorage.getItem('mozbotPaymentInProgress')

export const removePaymentInProgressFromStorage = () => {
  sessionStorage.removeItem('mozbotPaymentInProgress')
}
