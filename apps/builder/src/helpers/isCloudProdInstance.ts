import { env } from '@mozbot.io/env'

export const isCloudProdInstance = () => {
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'app.mozbot.io'
  }
  return env.NEXTAUTH_URL === 'https://app.mozbot.io'
}
