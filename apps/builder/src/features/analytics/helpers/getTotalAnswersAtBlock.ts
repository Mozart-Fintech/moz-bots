import { byId } from '@mozbot.io/lib'
import { PublicMozbotV6 } from '@mozbot.io/schemas'
import { TotalAnswers } from '@mozbot.io/schemas/features/analytics'

export const getTotalAnswersAtBlock = (
  currentBlockId: string,
  {
    publishedMozbot,
    totalAnswers,
  }: {
    publishedMozbot: PublicMozbotV6
    totalAnswers: TotalAnswers[]
  }
): number => {
  const block = publishedMozbot.groups
    .flatMap((g) => g.blocks)
    .find(byId(currentBlockId))
  if (!block) throw new Error(`Block ${currentBlockId} not found`)
  return totalAnswers.find((t) => t.blockId === block.id)?.total ?? 0
}
