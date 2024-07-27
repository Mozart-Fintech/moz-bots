import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { workspaceSchema } from '@mozbot.io/schemas'
import { z } from 'zod'
import { isAdminWriteWorkspaceForbidden } from '../helpers/isAdminWriteWorkspaceForbidden'

export const updateWorkspace = authenticatedProcedure
  .meta({
    openapi: {
      method: 'PATCH',
      path: '/v1/workspaces/{workspaceId}',
      protect: true,
      summary: 'Actualizar espacio de trabajo',
      tags: ['Workspace'],
    },
  })
  .input(
    z.object({
      name: z.string().optional(),
      icon: z.string().optional(),
      workspaceId: z
        .string()
        .describe(
          '[¿Dónde encontrar el ID de mi espacio de trabajo?](../how-to#how-to-find-my-workspaceid)'
        ),
    })
  )
  .output(
    z.object({
      workspace: workspaceSchema.pick({ name: true, icon: true }),
    })
  )
  .mutation(async ({ input: { workspaceId, ...updates }, ctx: { user } }) => {
    await prisma.workspace.updateMany({
      where: { members: { some: { userId: user.id } }, id: workspaceId },
      data: updates,
    })

    const workspace = await prisma.workspace.findFirst({
      where: { members: { some: { userId: user.id } }, id: workspaceId },
      include: { members: true },
    })

    if (!workspace)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No se encontraron espacios de trabajo',
      })

    if (isAdminWriteWorkspaceForbidden(workspace, user))
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No tienes permiso para actualizar este espacio de trabajo.',
      })

    return {
      workspace,
    }
  })
