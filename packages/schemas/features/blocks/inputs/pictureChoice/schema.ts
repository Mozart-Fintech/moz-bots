import { z } from '../../../../zod'
import { optionBaseSchema, blockBaseSchema } from '../../shared'
import { conditionSchema } from '../../logic'
import { InputBlockType } from '../constants'
import { itemBaseSchemas } from '../../../items/shared'

export const pictureChoiceOptionsSchema = optionBaseSchema.merge(
  z.object({
    isMultipleChoice: z.boolean().optional(),
    isSearchable: z.boolean().optional(),
    buttonLabel: z.string().optional(),
    searchInputPlaceholder: z.string().optional(),
    dynamicItems: z
      .object({
        isEnabled: z.boolean().optional(),
        titlesVariableId: z.string().optional(),
        descriptionsVariableId: z.string().optional(),
        pictureSrcsVariableId: z.string().optional(),
      })
      .optional(),
  })
)

export const pictureChoiceItemSchemas = {
  v5: itemBaseSchemas.v5.extend({
    pictureSrc: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    displayCondition: z
      .object({
        isEnabled: z.boolean().optional(),
        condition: conditionSchema.optional(),
      })
      .optional(),
  }),
  v6: itemBaseSchemas.v6.extend({
    pictureSrc: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    displayCondition: z
      .object({
        isEnabled: z.boolean().optional(),
        condition: conditionSchema.optional(),
      })
      .optional(),
  }),
}

export const pictureChoiceItemSchema = z.union([
  pictureChoiceItemSchemas.v5,
  pictureChoiceItemSchemas.v6,
])

export const pictureChoiceBlockV5Schema = blockBaseSchema.merge(
  z.object({
    type: z.enum([InputBlockType.PICTURE_CHOICE]),
    items: z.array(pictureChoiceItemSchemas.v5),
    options: pictureChoiceOptionsSchema.optional(),
  })
)

export const pictureChoiceBlockSchemas = {
  v5: pictureChoiceBlockV5Schema.openapi({
    title: 'Elección de imagen v5',
    ref: 'pictureChoiceV5',
  }),
  v6: pictureChoiceBlockV5Schema
    .extend({
      items: z.array(pictureChoiceItemSchemas.v6),
    })
    .openapi({
      title: 'Elección de imagen',
      ref: 'pictureChoice',
    }),
} as const

export const pictureChoiceBlockSchema = z.union([
  pictureChoiceBlockSchemas.v5,
  pictureChoiceBlockSchemas.v6,
])

export type PictureChoiceItem = z.infer<typeof pictureChoiceItemSchema>
export type PictureChoiceBlock = z.infer<typeof pictureChoiceBlockSchema>
