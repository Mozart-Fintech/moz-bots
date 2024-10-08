import { SmtpCredentials } from '@mozbot.io/schemas'
import { sendRequest } from '@mozbot.io/lib'

export const testSmtpConfig = (smtpData: SmtpCredentials['data'], to: string) =>
  sendRequest({
    method: 'POST',
    url: '/api/integrations/email/test-config',
    body: {
      ...smtpData,
      to,
    },
  })
