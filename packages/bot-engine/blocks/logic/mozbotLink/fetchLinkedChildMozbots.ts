import { User } from '@mozbot.io/prisma'
import {
  Block,
  PublicMozbot,
  Mozbot,
  MozbotLinkBlock,
} from '@mozbot.io/schemas'
import { isDefined } from '@mozbot.io/lib'
import { fetchLinkedMozbots } from './fetchLinkedMozbots'
import { LogicBlockType } from '@mozbot.io/schemas/features/blocks/logic/constants'

type Props = {
  mozbots: Pick<PublicMozbot, 'groups'>[]
  userId: string | undefined
  isPreview?: boolean
}

export const fetchLinkedChildMozbots =
  ({ mozbots, userId, isPreview }: Props) =>
  async (
    capturedLinkedBots: (Mozbot | PublicMozbot)[]
  ): Promise<(Mozbot | PublicMozbot)[]> => {
    const linkedmozbotIds = mozbots
      .flatMap((mozbot) =>
        (
          mozbot.groups
            .flatMap<Block>((group) => group.blocks)
            .filter(
              (block) =>
                block.type === LogicBlockType.MOZBOT_LINK &&
                isDefined(block.options?.mozbotId) &&
                !capturedLinkedBots.some(
                  (bot) =>
                    ('mozbotId' in bot ? bot.mozbotId : bot.id) ===
                    block.options?.mozbotId
                )
            ) as MozbotLinkBlock[]
        ).map((b) => b.options?.mozbotId)
      )
      .filter(isDefined)
    if (linkedmozbotIds.length === 0) return capturedLinkedBots
    const linkedMozbots = (await fetchLinkedMozbots({
      userId,
      mozbotIds: linkedmozbotIds,
      isPreview,
    })) as (Mozbot | PublicMozbot)[]
    return fetchLinkedChildMozbots({
      mozbots: linkedMozbots,
      userId,
      isPreview,
    })([...capturedLinkedBots, ...linkedMozbots])
  }
