import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { WorkspaceRole } from '@mozbot.io/prisma'
import { folderSchema } from '@mozbot.io/schemas'
import { z } from 'zod'
import { getUserRoleInWorkspace } from '@/features/workspace/helpers/getUserRoleInWorkspace'

export const deleteFolder = authenticatedProcedure
  .meta({
    openapi: {
      method: 'DELETE',
      path: '/v1/folders/{folderId}',
      protect: true,
      summary: 'Eliminar una carpeta',
      tags: ['Folder'],
    },
  })
  .input(
    z.object({
      folderId: z.string(),
      workspaceId: z.string(),
    })
  )
  .output(
    z.object({
      folder: folderSchema,
    })
  )
  .mutation(async ({ input: { folderId, workspaceId }, ctx: { user } }) => {
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

    const folder = await prisma.dashboardFolder.delete({
      where: {
        id: folderId,
      },
    })

    return { folder }
  })
