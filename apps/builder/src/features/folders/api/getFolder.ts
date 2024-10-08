import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { WorkspaceRole } from '@mozbot.io/prisma'
import { folderSchema } from '@mozbot.io/schemas'
import { z } from 'zod'
import { getUserRoleInWorkspace } from '@/features/workspace/helpers/getUserRoleInWorkspace'

export const getFolder = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/folders/{folderId}',
      protect: true,
      summary: 'Obtener carpeta',
      tags: ['Folder'],
    },
  })
  .input(
    z.object({
      workspaceId: z.string(),
      folderId: z.string(),
    })
  )
  .output(
    z.object({
      folder: folderSchema,
    })
  )
  .query(async ({ input: { workspaceId, folderId }, ctx: { user } }) => {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, members: true, plan: true },
    })
    const userRole = getUserRoleInWorkspace(user.id, workspace?.members)
    if (
      userRole === undefined ||
      userRole === WorkspaceRole.GUEST ||
      !workspace
    )
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Espacio de trabajo no encontrado',
      })

    const folder = await prisma.dashboardFolder.findUnique({
      where: {
        id: folderId,
        workspaceId,
      },
    })

    if (!folder)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Carpeta no encontrada',
      })

    return { folder }
  })
