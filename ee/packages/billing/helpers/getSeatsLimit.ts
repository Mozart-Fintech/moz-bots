import { Workspace } from '@mozbot.io/schemas'
import { seatsLimits } from '../constants'
import { Plan } from '@mozbot.io/prisma'

export const getSeatsLimit = ({
  plan,
  customSeatsLimit,
}: Pick<Workspace, 'plan' | 'customSeatsLimit'>) => {
  if (plan === Plan.UNLIMITED) return 'inf'
  if (plan === Plan.CUSTOM) return customSeatsLimit ? customSeatsLimit : 'inf'
  return seatsLimits[plan]
}
