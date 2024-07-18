import { createId } from '@paralleldrive/cuid2'
import { PublicMozbot, MozbotV6 } from '@mozbot.io/schemas'

export const convertMozbotToPublicMozbot = (
  mozbot: MozbotV6
): PublicMozbot => ({
  id: createId(),
  version: mozbot.version,
  mozbotId: mozbot.id,
  groups: mozbot.groups,
  events: mozbot.events,
  edges: mozbot.edges,
  settings: mozbot.settings,
  theme: mozbot.theme,
  variables: mozbot.variables,
  createdAt: new Date(),
  updatedAt: new Date(),
})
