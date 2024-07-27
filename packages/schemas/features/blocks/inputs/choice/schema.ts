import { z } from '../../../../zod'
import { InputBlockType } from '../constants'
import { itemBaseSchemas } from '../../../items/shared'
import { optionBaseSchema, blockBaseSchema } from '../../shared'
import { conditionSchema } from '../../logic'

export const choiceInputOptionsSchema = optionBaseSchema.merge(
  z.object({
    isMultipleChoice: z.boolean().optional(),
    buttonLabel: z.string().optional(),
    dynamicVariableId: z.string().optional(),
    listHeader: z.string().optional(),
    isSearchable: z.boolean().optional(),
    searchInputPlaceholder: z.string().optional(),
    retryMessageContentId: z.string().optional(),
    withFirstChoice: z.boolean().optional(),
    withLastChoice: z.boolean().optional(),
  })
)

export const buttonItemSchemas = {
  v5: itemBaseSchemas.v5.extend({
    content: z.string().optional(),
    description: z.string().optional(),
    displayCondition: z
      .object({
        isEnabled: z.boolean().optional(),
        condition: conditionSchema.optional(),
      })
      .optional(),
  }),
  v6: itemBaseSchemas.v6.extend({
    content: z.string().optional(),
    description: z.string().optional(),
    displayCondition: z
      .object({
        isEnabled: z.boolean().optional(),
        condition: conditionSchema.optional(),
      })
      .optional(),
  }),
}

export const buttonItemSchema = z.union([
  buttonItemSchemas.v5,
  buttonItemSchemas.v6,
])

export const buttonsInputV5Schema = blockBaseSchema.merge(
  z.object({
    type: z.enum([InputBlockType.CHOICE]),
    items: z.array(buttonItemSchemas.v5),
    options: choiceInputOptionsSchema.optional(),
  })
)

export const buttonsInputSchemas = {
  v5: buttonsInputV5Schema.openapi({
    title: 'Botones v5',
    ref: 'buttonsInputV5',
  }),
  v6: buttonsInputV5Schema
    .extend({
      items: z.array(buttonItemSchemas.v6),
    })
    .openapi({
      title: 'Botones',
      ref: 'buttonsInput',
    }),
} as const

export const buttonsInputSchema = z.union([
  buttonsInputSchemas.v5,
  buttonsInputSchemas.v6,
])

export type ButtonItem = z.infer<typeof buttonItemSchema>
export type ChoiceInputBlock = z.infer<typeof buttonsInputSchema>
