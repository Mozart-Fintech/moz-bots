import { authenticatedProcedure } from '@/helpers/server/trpc'
import { z } from 'zod'
import { getBillingPortalUrl as getBillingPortalUrlHandler } from '@mozbot.io/billing/api/getBillingPortalUrl'

export const getBillingPortalUrl = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/billing/subscription/portal',
      protect: true,
      summary: 'Obtener la URL del portal de facturación de Stripe',
      tags: ['Billing'],
    },
  })
  .input(
    z.object({
      workspaceId: z.string(),
    })
  )
  .output(
    z.object({
      billingPortalUrl: z.string(),
    })
  )
  .query(async ({ input: { workspaceId }, ctx: { user } }) =>
    getBillingPortalUrlHandler({ workspaceId, user })
  )
