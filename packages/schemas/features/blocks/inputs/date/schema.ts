import { z } from '../../../../zod'
import { optionBaseSchema, blockBaseSchema } from '../../shared'
import { InputBlockType } from '../constants'

export const dateInputOptionsSchema = optionBaseSchema.merge(
  z.object({
    labels: z
      .object({
        button: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .optional(),
    hasTime: z.boolean().optional(),
    isRange: z.boolean().optional(),
    format: z.string().optional(),
    min: z.string().optional(),
    max: z.string().optional(),
  })
)

export const dateInputSchema = blockBaseSchema
  .merge(
    z.object({
      type: z.enum([InputBlockType.DATE]),
      options: dateInputOptionsSchema.optional(),
    })
  )
  .openapi({
    title: 'Fecha',
    ref: 'dateInput',
  })

export type DateInputBlock = z.infer<typeof dateInputSchema>
