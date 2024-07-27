import { authenticatedProcedure } from '@/helpers/server/trpc'
import { z } from 'zod'
import { getUsage as getUsageHandler } from '@mozbot.io/billing/api/getUsage'

export const getUsage = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/billing/usage',
      protect: true,
      summary: 'Obtener el uso actual del plan',
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
  .output(z.object({ totalChatsUsed: z.number(), resetsAt: z.date() }))
  .query(async ({ input: { workspaceId }, ctx: { user } }) =>
    getUsageHandler({ workspaceId, user })
  )
