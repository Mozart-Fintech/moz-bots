import prisma from '@mozbot.io/lib/prisma'
import { canReadMozbots } from '@/helpers/databaseRules'
import { User } from '@mozbot.io/prisma'
import { Block, PublicMozbot, Mozbot } from '@mozbot.io/schemas'
import { LogicBlockType } from '@mozbot.io/schemas/features/blocks/logic/constants'

export const fetchLinkedMozbots = async (
  mozbot: Pick<PublicMozbot, 'groups'>,
  user?: User
): Promise<(Mozbot | PublicMozbot)[]> => {
  const linkedmozbotIds = mozbot.groups
    .flatMap<Block>((group) => group.blocks)
    .reduce<string[]>((mozbotIds, block) => {
      if (block.type !== LogicBlockType.MOZBOT_LINK) return mozbotIds
      const mozbotId = block.options?.mozbotId
      if (!mozbotId) return mozbotIds
      return mozbotIds.includes(mozbotId) ? mozbotIds : [...mozbotIds, mozbotId]
    }, [])
  if (linkedmozbotIds.length === 0) return []
  const mozbots = (await ('mozbotId' in mozbot
    ? prisma.publicMozbot.findMany({
        where: { id: { in: linkedmozbotIds } },
      })
    : prisma.mozbot.findMany({
        where: user
          ? {
              AND: [
                { id: { in: linkedmozbotIds } },
                canReadMozbots(linkedmozbotIds, user as User),
              ],
            }
          : { id: { in: linkedmozbotIds } },
      }))) as (Mozbot | PublicMozbot)[]
  return mozbots
}
