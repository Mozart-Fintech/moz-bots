import { PublicMozbot as PrismaPublicMozbot } from '@mozbot.io/prisma'
import {
  variableSchema,
  themeSchema,
  settingsSchema,
  groupV5Schema,
  groupV6Schema,
} from './mozbot'
import { z } from '../zod'
import { preprocessMozbot } from './mozbot/helpers/preprocessMozbot'
import { edgeSchema } from './mozbot/edge'
import { startEventSchema } from './events'

export const publicMozbotSchemaV5 = z.preprocess(
  preprocessMozbot,
  z.object({
    id: z.string(),
    version: z.enum(['3', '4', '5']),
    createdAt: z.date(),
    updatedAt: z.date(),
    mozbotId: z.string(),
    groups: z.array(groupV5Schema),
    events: z.null().openapi({
      type: 'array',
    }),
    edges: z.array(edgeSchema),
    variables: z.array(variableSchema),
    theme: themeSchema,
    settings: settingsSchema,
  })
) satisfies z.ZodType<Partial<PrismaPublicMozbot>, z.ZodTypeDef, unknown>
export type PublicMozbotV5 = z.infer<typeof publicMozbotSchemaV5>

export const publicMozbotSchemaV6 = publicMozbotSchemaV5._def.schema.extend({
  version: z.literal('6'),
  groups: z.array(groupV6Schema),
  events: z.tuple([startEventSchema]),
})
export type PublicMozbotV6 = z.infer<typeof publicMozbotSchemaV6>

export const publicMozbotSchema = z.preprocess(
  preprocessMozbot,
  z.discriminatedUnion('version', [
    publicMozbotSchemaV6.openapi({
      ref: 'publicMozbotV6',
      title: 'Public Mozbot V6',
    }),
    publicMozbotSchemaV5._def.schema.openapi({
      ref: 'publicMozbotV5',
      title: 'Public Mozbot V5',
    }),
  ])
)
export type PublicMozbot = z.infer<typeof publicMozbotSchema>
