import { RatingInputBlock } from '@mozbot.io/schemas'
import { defaultRatingInputOptions } from '@mozbot.io/schemas/features/blocks/inputs/rating/constants'

export const validateRatingReply = (reply: string, block: RatingInputBlock) =>
  Number(reply) <= (block.options?.length ?? defaultRatingInputOptions.length)
