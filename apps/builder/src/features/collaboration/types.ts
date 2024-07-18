import { CollaboratorsOnMozbots } from '@mozbot.io/prisma'

export type Collaborator = CollaboratorsOnMozbots & {
  user: {
    name: string | null
    image: string | null
    email: string | null
  }
}
