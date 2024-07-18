import prisma from '@mozbot.io/lib/prisma'

type Props = {
  publicId: string
}

export const findPublicMozbot = ({ publicId }: Props) =>
  prisma.publicMozbot.findFirst({
    where: { mozbot: { publicId } },
    select: {
      version: true,
      groups: true,
      events: true,
      edges: true,
      settings: true,
      theme: true,
      variables: true,
      mozbotId: true,
      mozbot: {
        select: {
          isArchived: true,
          isClosed: true,
          workspace: {
            select: {
              id: true,
              plan: true,
              customChatsLimit: true,
              isQuarantined: true,
              isSuspended: true,
            },
          },
        },
      },
    },
  })
