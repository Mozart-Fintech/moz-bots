import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { WorkspaceRole } from '@mozbot.io/prisma'
import { PublicMozbot, Mozbot, mozbotV5Schema } from '@mozbot.io/schemas'
import { omit } from '@mozbot.io/lib'
import { z } from 'zod'
import { getUserRoleInWorkspace } from '@/features/workspace/helpers/getUserRoleInWorkspace'

export const listMozbots = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/mozbots',
      protect: true,
      summary: 'List mozbots',
      tags: ['Mozbot'],
    },
  })
  .input(
    z.object({
      workspaceId: z
        .string()
        .describe(
          '[¿Dónde encontrar el ID de mi espacio de trabajo?](../how-to#how-to-find-my-workspaceid)'
        ),
      folderId: z.string().optional(),
    })
  )
  .output(
    z.object({
      mozbots: z.array(
        mozbotV5Schema._def.schema
          .pick({
            name: true,
            icon: true,
            id: true,
          })
          .merge(z.object({ publishedmozbotId: z.string().optional() }))
      ),
    })
  )
  .query(async ({ input: { workspaceId, folderId }, ctx: { user } }) => {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { members: true },
    })
    const userRole = getUserRoleInWorkspace(user.id, workspace?.members)
    if (userRole === undefined)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Espacio de trabajo no encontrado',
      })
    const mozbots = (await prisma.mozbot.findMany({
      where: {
        isArchived: { not: true },
        folderId:
          userRole === WorkspaceRole.GUEST
            ? undefined
            : folderId === 'root'
            ? null
            : folderId,
        workspaceId,
        collaborators:
          userRole === WorkspaceRole.GUEST
            ? { some: { userId: user.id } }
            : undefined,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        name: true,
        publishedMozbot: { select: { id: true } },
        id: true,
        icon: true,
      },
    })) as (Pick<Mozbot, 'name' | 'id' | 'icon'> & {
      publishedMozbot: Pick<PublicMozbot, 'id'>
    })[]

    if (!mozbots)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No se encontraron mozbots',
      })

    return {
      mozbots: mozbots.map((mozbot) => ({
        publishedmozbotId: mozbot.publishedMozbot?.id,
        ...omit(mozbot, 'publishedMozbot'),
      })),
    }
  })
