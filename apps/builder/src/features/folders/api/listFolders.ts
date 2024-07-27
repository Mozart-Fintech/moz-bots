import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { WorkspaceRole } from '@mozbot.io/prisma'
import { folderSchema } from '@mozbot.io/schemas'
import { z } from 'zod'
import { getUserRoleInWorkspace } from '@/features/workspace/helpers/getUserRoleInWorkspace'

export const listFolders = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/folders',
      protect: true,
      summary: 'Listar carpetas',
      tags: ['Folder'],
    },
  })
  .input(
    z.object({
      workspaceId: z.string(),
      parentFolderId: z.string().optional(),
    })
  )
  .output(
    z.object({
      folders: z.array(folderSchema),
    })
  )
  .query(async ({ input: { workspaceId, parentFolderId }, ctx: { user } }) => {
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

    const folders = await prisma.dashboardFolder.findMany({
      where: {
        workspaceId,
        parentFolderId: parentFolderId ?? null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return { folders }
  })
