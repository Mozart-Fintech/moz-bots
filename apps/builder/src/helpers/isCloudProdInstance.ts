import { env } from '@mozbot.io/env'

export const isCloudProdInstance = () => {
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'mozbot.mozartfintech.com'
  }
  return env.NEXTAUTH_URL === 'https://mozbot.mozartfintech.com'
}
