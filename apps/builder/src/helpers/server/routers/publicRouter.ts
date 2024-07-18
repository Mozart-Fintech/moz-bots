import { billingRouter } from '@/features/billing/api/router'
import { webhookRouter } from '@/features/blocks/integrations/webhook/api/router'
import { getLinkedMozbots } from '@/features/blocks/logic/mozbotLink/api/getLinkedMozbots'
import { credentialsRouter } from '@/features/credentials/api/router'
import { resultsRouter } from '@/features/results/api/router'
import { themeRouter } from '@/features/theme/api/router'
import { mozbotRouter } from '@/features/mozbot/api/router'
import { workspaceRouter } from '@/features/workspace/api/router'
import { router } from '../trpc'
import { analyticsRouter } from '@/features/analytics/api/router'
import { collaboratorsRouter } from '@/features/collaboration/api/router'
import { customDomainsRouter } from '@/features/customDomains/api/router'
import { publicWhatsAppRouter } from '@/features/whatsapp/router'
import { folderRouter } from '@/features/folders/api/router'

export const publicRouter = router({
  getLinkedMozbots,
  analytics: analyticsRouter,
  workspace: workspaceRouter,
  mozbot: mozbotRouter,
  webhook: webhookRouter,
  results: resultsRouter,
  billing: billingRouter,
  credentials: credentialsRouter,
  theme: themeRouter,
  collaborators: collaboratorsRouter,
  customDomains: customDomainsRouter,
  whatsApp: publicWhatsAppRouter,
  folders: folderRouter,
})

export type PublicRouter = typeof publicRouter
