import { authenticatedProcedure } from '@/helpers/server/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import prisma from '@mozbot.io/lib/prisma'
import { getUserRoleInWorkspace } from '@/features/workspace/helpers/getUserRoleInWorkspace'
import { WorkspaceRole } from '@mozbot.io/prisma'
import { isWriteMozbotForbidden } from '@/features/mozbot/helpers/isWriteMozbotForbidden'
import { trackEvents } from '@mozbot.io/telemetry/trackEvents'
import { clientSideCreateEventSchema } from '@mozbot.io/schemas'

export const trackClientEvents = authenticatedProcedure
  .input(
    z.object({
      events: z.array(clientSideCreateEventSchema),
    })
  )
  .output(
    z.object({
      message: z.literal('success'),
    })
  )
  .mutation(async ({ input: { events }, ctx: { user } }) => {
    const workspaces = await prisma.workspace.findMany({
      where: {
        id: {
          in: events
            .filter((event) => 'workspaceId' in event)
            .map((event) => (event as { workspaceId: string }).workspaceId),
        },
      },
      select: {
        id: true,
        members: true,
      },
    })
    const mozbots = await prisma.mozbot.findMany({
      where: {
        id: {
          in: events
            .filter((event) => 'mozbotId' in event)
            .map((event) => (event as { mozbotId: string }).mozbotId),
        },
      },
      select: {
        id: true,
        workspaceId: true,
        workspace: {
          select: {
            isSuspended: true,
            isPastDue: true,
            members: {
              select: {
                role: true,
                userId: true,
              },
            },
          },
        },
        collaborators: {
          select: {
            userId: true,
            type: true,
          },
        },
      },
    })
    for (const event of events) {
      if ('workspaceId' in event) {
        const workspace = workspaces.find((w) => w.id === event.workspaceId)
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
      }

      if ('mozbotId' in event) {
        const mozbot = mozbots.find((t) => t.id === event.mozbotId)
        if (!mozbot || (await isWriteMozbotForbidden(mozbot, user)))
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Mozbot no encontrado',
          })
      }
    }

    await trackEvents(events.map((e) => ({ ...e, userId: user.id })))

    return { message: 'success' }
  })
