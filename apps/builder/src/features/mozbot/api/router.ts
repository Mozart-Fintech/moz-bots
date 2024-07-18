import { router } from '@/helpers/server/trpc'
import { listMozbots } from './listMozbots'
import { createMozbot } from './createMozbot'
import { updateMozbot } from './updateMozbot'
import { getMozbot } from './getMozbot'
import { getPublishedMozbot } from './getPublishedMozbot'
import { publishMozbot } from './publishMozbot'
import { unpublishMozbot } from './unpublishMozbot'
import { deleteMozbot } from './deleteMozbot'
import { importMozbot } from './importMozbot'

export const mozbotRouter = router({
  createMozbot,
  updateMozbot,
  getMozbot,
  getPublishedMozbot,
  publishMozbot,
  unpublishMozbot,
  listMozbots,
  deleteMozbot,
  importMozbot,
})
