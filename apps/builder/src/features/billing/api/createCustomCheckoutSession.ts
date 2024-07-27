import { authenticatedProcedure } from '@/helpers/server/trpc'
import { z } from 'zod'
import { createCustomCheckoutSession as createCustomCheckoutSessionHandler } from '@mozbot.io/billing/api/createCustomCheckoutSession'

export const createCustomCheckoutSession = authenticatedProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/billing/subscription/custom-checkout',
      protect: true,
      summary:
        'Cree una sesión de pago personalizada para que un espacio de trabajo pague por un plan personalizado',
      tags: ['Billing'],
    },
  })
  .input(
    z.object({
      email: z.string(),
      workspaceId: z.string(),
      returnUrl: z.string(),
    })
  )
  .output(
    z.object({
      checkoutUrl: z.string(),
    })
  )
  .mutation(async ({ input, ctx: { user } }) =>
    createCustomCheckoutSessionHandler({
      ...input,
      user,
    })
  )
