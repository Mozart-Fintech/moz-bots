import { stringify } from 'qs'

export const getGoogleSheetsConsentScreenUrlQuery = (
  redirectUrl: string,
  workspaceId: string,
  blockId?: string,
  mozbotId?: string
) => {
  const queryParams = stringify({
    redirectUrl,
    blockId,
    workspaceId,
    mozbotId,
  })
  return `/api/credentials/google-sheets/consent-url?${queryParams}`
}
