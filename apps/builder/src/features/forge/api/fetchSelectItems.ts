import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { isReadWorkspaceFobidden } from '@/features/workspace/helpers/isReadWorkspaceFobidden'
import { forgedBlocks } from '@mozbot.io/forge-repository/definitions'
import { forgedBlockIds } from '@mozbot.io/forge-repository/constants'
import { decrypt } from '@mozbot.io/lib/api/encryption/decrypt'

export const fetchSelectItems = authenticatedProcedure
  .input(
    z.object({
      integrationId: z.enum(forgedBlockIds),
      fetcherId: z.string(),
      options: z.any(),
      workspaceId: z.string(),
    })
  )
  .query(
    async ({
      input: { workspaceId, integrationId, fetcherId, options },
      ctx: { user },
    }) => {
      const workspace = await prisma.workspace.findFirst({
        where: { id: workspaceId },
        select: {
          members: {
            select: {
              userId: true,
            },
          },
          credentials: options.credentialsId
            ? {
                where: {
                  id: options.credentialsId,
                },
                select: {
                  id: true,
                  data: true,
                  iv: true,
                },
              }
            : undefined,
        },
      })

      if (!workspace || isReadWorkspaceFobidden(workspace, user))
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No se encontró ningún espacio de trabajo',
        })

      const credentials = workspace.credentials?.at(0)

      const credentialsData = credentials
        ? await decrypt(credentials.data, credentials.iv)
        : undefined

      const blockDef = forgedBlocks[integrationId]

      const fetchers = (blockDef?.fetchers ?? []).concat(
        blockDef?.actions.flatMap((action) => action.fetchers ?? []) ?? []
      )
      const fetcher = fetchers.find((fetcher) => fetcher.id === fetcherId)

      if (!fetcher) return { items: [] }

      return {
        items: await fetcher.fetch({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          credentials: credentialsData as any,
          options,
        }),
      }
    }
  )
