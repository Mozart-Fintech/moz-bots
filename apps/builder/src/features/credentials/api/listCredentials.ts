import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { isReadWorkspaceFobidden } from '@/features/workspace/helpers/isReadWorkspaceFobidden'
import { credentialsTypeSchema } from '@mozbot.io/schemas'
import { isDefined } from '@udecode/plate-common'

const outputCredentialsSchema = z.array(
  z.object({
    id: z.string(),
    type: credentialsTypeSchema,
    name: z.string(),
  })
)

export const listCredentials = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/credentials',
      protect: true,
      summary: 'List workspace credentials',
      tags: ['Credentials'],
    },
  })
  .input(
    z.object({
      workspaceId: z.string(),
      type: credentialsTypeSchema.optional(),
    })
  )
  .output(
    z.object({
      credentials: outputCredentialsSchema,
    })
  )
  .query(async ({ input: { workspaceId, type }, ctx: { user } }) => {
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
      },
      select: {
        id: true,
        members: true,
        credentials: {
          where: {
            type,
          },
          select: {
            id: true,
            type: true,
            name: true,
          },
        },
      },
    })
    if (!workspace || isReadWorkspaceFobidden(workspace, user))
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' })

    return {
      credentials: outputCredentialsSchema.parse(
        isDefined(type)
          ? workspace.credentials
          : workspace.credentials.sort((a, b) => a.type.localeCompare(b.type))
      ),
    }
  })
