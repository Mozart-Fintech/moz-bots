import prisma from '@mozbot.io/lib/prisma'

type Props = {
  isPreview?: boolean
  mozbotIds: string[]
  userId: string | undefined
}

export const fetchLinkedMozbots = async ({
  userId,
  isPreview,
  mozbotIds,
}: Props) => {
  if (!userId || !isPreview)
    return prisma.publicMozbot.findMany({
      where: { mozbotId: { in: mozbotIds } },
    })
  const linkedMozbots = await prisma.mozbot.findMany({
    where: { id: { in: mozbotIds } },
    include: {
      collaborators: {
        select: {
          userId: true,
        },
      },
      workspace: {
        select: {
          members: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  })

  return linkedMozbots.filter(
    (mozbot) =>
      mozbot.collaborators.some(
        (collaborator) => collaborator.userId === userId
      ) || mozbot.workspace.members.some((member) => member.userId === userId)
  )
}
