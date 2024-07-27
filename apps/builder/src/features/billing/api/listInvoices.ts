import { authenticatedProcedure } from '@/helpers/server/trpc'
import { z } from 'zod'
import { invoiceSchema } from '@mozbot.io/schemas/features/billing/invoice'
import { listInvoices as listInvoicesHandler } from '@mozbot.io/billing/api/listInvoices'

export const listInvoices = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/billing/invoices',
      protect: true,
      summary: 'Listar facturas',
      tags: ['Billing'],
    },
  })
  .input(
    z.object({
      workspaceId: z
        .string()
        .describe(
          '[¿Dónde encontrar mi ID de espacio de trabajo?](../how-to#how-to-find-my-workspaceid)'
        ),
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceSchema),
    })
  )
  .query(async ({ input: { workspaceId }, ctx: { user } }) =>
    listInvoicesHandler({ workspaceId, user })
  )
