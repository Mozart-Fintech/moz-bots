import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { collaboratorSchema } from '@mozbot.io/schemas/features/collaborators'
import { isReadMozbotForbidden } from '@/features/mozbot/helpers/isReadMozbotForbidden'

export const getCollaborators = authenticatedProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/mozbots/{mozbotId}/collaborators',
      protect: true,
      summary: 'Get collaborators',
      tags: ['Collaborators'],
    },
  })
  .input(
    z.object({
      mozbotId: z.string(),
    })
  )
  .output(
    z.object({
      collaborators: z.array(collaboratorSchema),
    })
  )
  .query(async ({ input: { mozbotId }, ctx: { user } }) => {
    const existingMozbot = await prisma.mozbot.findFirst({
      where: {
        id: mozbotId,
      },
      include: {
        collaborators: true,
        workspace: {
          select: {
            isSuspended: true,
            isPastDue: true,
            members: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    })
    if (
      !existingMozbot?.id ||
      (await isReadMozbotForbidden(existingMozbot, user))
    )
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Mozbot not found' })

    return {
      collaborators: existingMozbot.collaborators,
    }
  })
