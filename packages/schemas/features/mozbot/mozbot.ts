import { z } from '../../zod'
import { settingsSchema } from './settings'
import { themeSchema } from './theme'
import { variableSchema } from './variable'
import { Mozbot as MozbotPrisma } from '@mozbot.io/prisma'
import {
  preprocessColumnsWidthResults,
  preprocessMozbot,
} from './helpers/preprocessMozbot'
import { edgeSchema } from './edge'
import { groupV5Schema, groupV6Schema } from './group'
import { startEventSchema } from '../events/start/schema'

export const resultsTablePreferencesSchema = z.object({
  columnsOrder: z.array(z.string()),
  columnsVisibility: z.record(z.string(), z.boolean()),
  columnsWidth: z.preprocess(
    preprocessColumnsWidthResults,
    z.record(z.string(), z.number())
  ),
})

const isDomainNameWithPathNameCompatible = (str: string) =>
  /^(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[\w-\/]*)?)$/.test(
    str
  )

export const mozbotV5Schema = z.preprocess(
  preprocessMozbot,
  z.object({
    version: z.enum(['3', '4', '5']),
    id: z.string(),
    name: z.string(),
    events: z
      .preprocess((val) => (val === undefined ? null : val), z.null())
      .openapi({ type: 'array' }),
    groups: z.array(groupV5Schema),
    edges: z.array(edgeSchema),
    variables: z.array(variableSchema),
    theme: themeSchema,
    selectedThemeTemplateId: z.string().nullable(),
    settings: settingsSchema,
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    icon: z.string().nullable(),
    folderId: z.string().nullable(),
    publicId: z
      .string()
      .refine((str) => /^[a-zA-Z0-9-.]+$/.test(str))
      .nullable(),
    customDomain: z
      .string()
      .refine(isDomainNameWithPathNameCompatible)
      .nullable(),
    workspaceId: z.string(),
    resultsTablePreferences: resultsTablePreferencesSchema.nullable(),
    isArchived: z.boolean(),
    isClosed: z.boolean(),
    whatsAppCredentialsId: z.string().nullable(),
    riskLevel: z.number().nullable(),
  }) satisfies z.ZodType<MozbotPrisma, z.ZodTypeDef, unknown>
)

export type MozbotV5 = z.infer<typeof mozbotV5Schema>

export const mozbotV6Schema = mozbotV5Schema._def.schema
  .extend({
    version: z.literal('6'),
    groups: z.array(groupV6Schema),
    events: z.tuple([startEventSchema]),
  })
  .openapi({
    title: 'Mozbot V6',
    ref: 'mozbotV6',
  })
export type MozbotV6 = z.infer<typeof mozbotV6Schema>

export const mozbotSchema = z.preprocess(
  preprocessMozbot,
  z.discriminatedUnion('version', [
    mozbotV6Schema,
    mozbotV5Schema._def.schema.openapi({
      title: 'Mozbot V5',
      ref: 'mozbotV5',
    }),
  ])
)
export type Mozbot = z.infer<typeof mozbotSchema>

export type ResultsTablePreferences = z.infer<
  typeof resultsTablePreferencesSchema
>
