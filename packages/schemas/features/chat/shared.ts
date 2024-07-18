import { z } from '../../zod'
import { publicMozbotSchemaV5, publicMozbotSchemaV6 } from '../publicMozbot'
import { preprocessMozbot } from '../mozbot/helpers/preprocessMozbot'

const mozbotInSessionStatePick = {
  version: true,
  id: true,
  groups: true,
  events: true,
  edges: true,
  variables: true,
} as const
export const mozbotInSessionStateSchema = z.preprocess(
  preprocessMozbot,
  z.discriminatedUnion('version', [
    publicMozbotSchemaV5._def.schema.pick(mozbotInSessionStatePick),
    publicMozbotSchemaV6.pick(mozbotInSessionStatePick),
  ])
)
export type MozbotInSession = z.infer<typeof mozbotInSessionStateSchema>

export const dynamicThemeSchema = z.object({
  hostAvatarUrl: z.string().optional(),
  guestAvatarUrl: z.string().optional(),
})
