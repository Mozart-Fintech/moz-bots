import { StartChatResponse } from '@mozbot.io/schemas/features/chat/schema'
import { defaultSettings } from '@mozbot.io/schemas/features/mozbot/settings/constants'

const storageResultIdKey = 'resultId'

export const getExistingResultIdFromStorage = (mozbotId?: string) => {
  if (!mozbotId) return
  try {
    return (
      sessionStorage.getItem(`${storageResultIdKey}-${mozbotId}`) ??
      localStorage.getItem(`${storageResultIdKey}-${mozbotId}`) ??
      undefined
    )
  } catch {
    /* empty */
  }
}

export const setResultInStorage =
  (storageType: 'local' | 'session' = 'session') =>
  (mozbotId: string, resultId: string) => {
    try {
      parseRememberUserStorage(storageType).setItem(
        `${storageResultIdKey}-${mozbotId}`,
        resultId
      )
    } catch {
      /* empty */
    }
  }

export const getInitialChatReplyFromStorage = (
  mozbotId: string | undefined
) => {
  if (!mozbotId) return
  try {
    const rawInitialChatReply =
      sessionStorage.getItem(`mozbot-${mozbotId}-initialChatReply`) ??
      localStorage.getItem(`mozbot-${mozbotId}-initialChatReply`)
    if (!rawInitialChatReply) return
    return JSON.parse(rawInitialChatReply) as StartChatResponse
  } catch {
    /* empty */
  }
}
export const setInitialChatReplyInStorage = (
  initialChatReply: StartChatResponse,
  {
    mozbotId,
    storage,
  }: {
    mozbotId: string
    storage?: 'local' | 'session'
  }
) => {
  try {
    const rawInitialChatReply = JSON.stringify(initialChatReply)
    parseRememberUserStorage(storage).setItem(
      `mozbot-${mozbotId}-initialChatReply`,
      rawInitialChatReply
    )
  } catch {
    /* empty */
  }
}

export const setBotOpenedStateInStorage = () => {
  try {
    sessionStorage.setItem(`mozbot-botOpened`, 'true')
  } catch {
    /* empty */
  }
}

export const removeBotOpenedStateInStorage = () => {
  try {
    sessionStorage.removeItem(`mozbot-botOpened`)
  } catch {
    /* empty */
  }
}

export const getBotOpenedStateFromStorage = () => {
  try {
    return sessionStorage.getItem(`mozbot-botOpened`) === 'true'
  } catch {
    return false
  }
}

export const parseRememberUserStorage = (
  storage: 'local' | 'session' | undefined
): typeof localStorage | typeof sessionStorage =>
  (storage ?? defaultSettings.general.rememberUser.storage) === 'session'
    ? sessionStorage
    : localStorage

export const wipeExistingChatStateInStorage = (mozbotId: string) => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(`mozbot-${mozbotId}`)) localStorage.removeItem(key)
  })
  Object.keys(sessionStorage).forEach((key) => {
    if (key.startsWith(`mozbot-${mozbotId}`)) sessionStorage.removeItem(key)
  })
}
