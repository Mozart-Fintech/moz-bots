import { CollaborationType, CollaboratorsOnMozbots } from '@mozbot.io/prisma'
import { z } from '../zod'

export const collaboratorSchema = z.object({
  type: z.nativeEnum(CollaborationType),
  userId: z.string(),
  mozbotId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodType<CollaboratorsOnMozbots>
