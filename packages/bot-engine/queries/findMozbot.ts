import prisma from '@mozbot.io/lib/prisma'

type Props = {
  id: string
  userId?: string
}

export const findMozbot = ({ id, userId }: Props) =>
  prisma.mozbot.findFirst({
    where: { id, workspace: { members: { some: { userId } } } },
    select: {
      version: true,
      id: true,
      groups: true,
      events: true,
      edges: true,
      settings: true,
      theme: true,
      variables: true,
      isArchived: true,
    },
  })
