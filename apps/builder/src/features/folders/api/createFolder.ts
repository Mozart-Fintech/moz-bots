import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { DashboardFolder, Plan, WorkspaceRole } from '@mozbot.io/prisma'
import { folderSchema } from '@mozbot.io/schemas'
import { z } from 'zod'
import { getUserRoleInWorkspace } from '@/features/workspace/helpers/getUserRoleInWorkspace'
import { trackEvents } from '@mozbot.io/telemetry/trackEvents'

export const createFolder = authenticatedProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/folders',
      protect: true,
      summary: 'Crear una carpeta',
      tags: ['Folder'],
    },
  })
  .input(
    z.object({
      workspaceId: z.string(),
      folderName: z.string().default(''),
      parentFolderId: z.string().optional(),
    })
  )
  .output(
    z.object({
      folder: folderSchema,
    })
  )
  .mutation(
    async ({
      input: { folderName, parentFolderId, workspaceId },
      ctx: { user },
    }) => {
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

      const newFolder = await prisma.dashboardFolder.create({
        data: {
          workspaceId,
          name: folderName,
          parentFolderId,
        } satisfies Partial<DashboardFolder>,
      })

      await trackEvents([
        {
          name: 'Folder created',
          userId: user.id,
          workspaceId,
        },
      ])

      return { folder: folderSchema.parse(newFolder) }
    }
  )
