import { z } from '../../../../zod'
import { blockBaseSchema } from '../../shared'
import { LogicBlockType } from '../constants'

export const mozbotLinkOptionsSchema = z.object({
  mozbotId: z.string().optional(),
  groupId: z.string().optional(),
  mergeResults: z.boolean().optional(),
})

export const mozbotLinkBlockSchema = blockBaseSchema.merge(
  z.object({
    type: z.enum([LogicBlockType.MOZBOT_LINK]),
    options: mozbotLinkOptionsSchema.optional(),
  })
)

export type MozbotLinkBlock = z.infer<typeof mozbotLinkBlockSchema>
