import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { isWriteWorkspaceForbidden } from '@/features/workspace/helpers/isWriteWorkspaceForbidden'
import { decrypt } from '@mozbot.io/lib/api/encryption/decrypt'

export const getCredentials = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/credentials/{credentialsId}',
      protect: true,
      summary: 'Obtener datos de credenciales',
      tags: ['Credentials'],
    },
  })
  .input(
    z.object({
      workspaceId: z.string(),
      credentialsId: z.string(),
    })
  )
  .output(
    z.object({
      name: z.string(),
      data: z.any(),
    })
  )
  .query(async ({ input: { workspaceId, credentialsId }, ctx: { user } }) => {
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
      },
      select: {
        id: true,
        members: true,
      },
    })
    if (!workspace || isWriteWorkspaceForbidden(workspace, user))
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Espacio de trabajo no encontrado',
      })

    const credentials = await prisma.credentials.findFirst({
      where: {
        id: credentialsId,
      },
      select: {
        data: true,
        iv: true,
        name: true,
      },
    })

    if (!credentials)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Credenciales no encontradas',
      })

    const credentialsData = await decrypt(credentials.data, credentials.iv)

    return {
      name: credentials.name,
      data: credentialsData,
    }
  })
