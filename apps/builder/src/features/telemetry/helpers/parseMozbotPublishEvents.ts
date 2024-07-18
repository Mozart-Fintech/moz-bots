import { env } from '@mozbot.io/env'
import prisma from '@mozbot.io/lib/prisma'
import { parseGroups, Mozbot } from '@mozbot.io/schemas'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'

type Props = {
  existingMozbot: Pick<Mozbot, 'id' | 'workspaceId'>
  userId: string
  hasFileUploadBlocks: boolean
}

export const parseMozbotPublishEvents = async ({
  existingMozbot,
  userId,
  hasFileUploadBlocks,
}: Props) => {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) return []
  const events = []
  const existingPublishedMozbot = await prisma.publicMozbot.findFirst({
    where: {
      mozbotId: existingMozbot.id,
    },
    select: {
      version: true,
      groups: true,
      settings: true,
    },
  })

  const isPublishingFileUploadBlockForTheFirstTime =
    hasFileUploadBlocks &&
    (!existingPublishedMozbot ||
      !parseGroups(existingPublishedMozbot.groups, {
        mozbotVersion: existingPublishedMozbot.version,
      }).some((group) =>
        group.blocks.some((block) => block.type === InputBlockType.FILE)
      ))

  if (isPublishingFileUploadBlockForTheFirstTime)
    events.push({
      name: 'File upload block published',
      workspaceId: existingMozbot.workspaceId,
      mozbotId: existingMozbot.id,
      userId,
    } as const)

  return events
}
