import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { ThemeTemplate, themeTemplateSchema } from '@mozbot.io/schemas'
import { z } from 'zod'
import { getUserRoleInWorkspace } from '@/features/workspace/helpers/getUserRoleInWorkspace'
import { WorkspaceRole } from '@mozbot.io/prisma'

export const deleteThemeTemplate = authenticatedProcedure
  .meta({
    openapi: {
      method: 'DELETE',
      path: '/v1/themeTemplates/{themeTemplateId}',
      protect: true,
      summary: 'Eliminar una plantilla de tema',
      tags: ['Theme template'],
    },
  })
  .input(
    z.object({
      workspaceId: z.string(),
      themeTemplateId: z.string(),
    })
  )
  .output(
    z.object({
      themeTemplate: themeTemplateSchema,
    })
  )
  .mutation(
    async ({ input: { themeTemplateId, workspaceId }, ctx: { user } }) => {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          members: true,
        },
      })
      const userRole = getUserRoleInWorkspace(user.id, workspace?.members)
      if (userRole === undefined || userRole === WorkspaceRole.GUEST)
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Espacio de trabajo no encontrado',
        })

      const themeTemplate = (await prisma.themeTemplate.delete({
        where: {
          id: themeTemplateId,
        },
      })) as ThemeTemplate

      return {
        themeTemplate,
      }
    }
  )
