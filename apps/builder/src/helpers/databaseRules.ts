import {
  CollaborationType,
  Plan,
  Prisma,
  User,
  WorkspaceRole,
} from '@mozbot.io/prisma'
import prisma from '@mozbot.io/lib/prisma'
import { NextApiResponse } from 'next'
import { forbidden } from '@mozbot.io/lib/api'
import { env } from '@mozbot.io/env'

export const canWriteMozbots = (
  mozbotIds: string[] | string,
  user: Pick<User, 'email' | 'id'>
): Prisma.MozbotWhereInput =>
  env.NEXT_PUBLIC_E2E_TEST
    ? { id: typeof mozbotIds === 'string' ? mozbotIds : { in: mozbotIds } }
    : {
        id: typeof mozbotIds === 'string' ? mozbotIds : { in: mozbotIds },
        OR: [
          {
            workspace: {
              members: {
                some: { userId: user.id, role: { not: WorkspaceRole.GUEST } },
              },
            },
          },
          {
            collaborators: {
              some: { userId: user.id, type: { not: CollaborationType.READ } },
            },
          },
        ],
      }

export const canReadMozbots = (
  mozbotIds: string | string[],
  user: Pick<User, 'email' | 'id'>
) => ({
  id: typeof mozbotIds === 'string' ? mozbotIds : { in: mozbotIds },
  workspace:
    env.ADMIN_EMAIL?.some((email) => email === user.email) ||
    env.NEXT_PUBLIC_E2E_TEST
      ? undefined
      : {
          members: {
            some: { userId: user.id },
          },
        },
})

export const canEditGuests = (user: User, mozbotId: string) => ({
  id: mozbotId,
  workspace: {
    members: {
      some: { userId: user.id, role: { not: WorkspaceRole.GUEST } },
    },
  },
})

export const canPublishFileInput = async ({
  userId,
  workspaceId,
  res,
}: {
  userId: string
  workspaceId: string
  res: NextApiResponse
}) => {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, members: { some: { userId } } },
    select: { plan: true },
  })
  if (!workspace) {
    forbidden(res, 'workspace not found')
    return false
  }
  if (workspace?.plan === Plan.FREE) {
    forbidden(res, 'You need to upgrade your plan to use file input blocks')
    return false
  }
  return true
}

export const isUniqueConstraintError = (error: unknown) =>
  typeof error === 'object' &&
  error &&
  'code' in error &&
  error.code === 'P2002'
