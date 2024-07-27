import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { Plan, WorkspaceRole } from '@mozbot.io/prisma'
import { folderSchema } from '@mozbot.io/schemas'
import { z } from 'zod'
import { getUserRoleInWorkspace } from '@/features/workspace/helpers/getUserRoleInWorkspace'

export const updateFolder = authenticatedProcedure
  .meta({
    openapi: {
      method: 'PATCH',
      path: '/v1/folders/{folderId}',
      protect: true,
      summary: 'Actualizar una carpeta',
      tags: ['Folder'],
    },
  })
  .input(
    z.object({
      folderId: z.string(),
      workspaceId: z.string(),
      folder: folderSchema
        .pick({
          name: true,
          parentFolderId: true,
        })
        .partial(),
    })
  )
  .output(
    z.object({
      folder: folderSchema,
    })
  )
  .mutation(
    async ({ input: { folder, folderId, workspaceId }, ctx: { user } }) => {
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

      if (workspace.plan === Plan.FREE)
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Necesita actualizar a un plan pago para crear carpetas',
        })

      const updatedFolder = await prisma.dashboardFolder.update({
        where: {
          id: folderId,
        },
        data: {
          name: folder.name,
          parentFolderId: folder.parentFolderId,
        },
      })

      return { folder: folderSchema.parse(updatedFolder) }
    }
  )
