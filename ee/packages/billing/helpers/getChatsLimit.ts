import { Plan } from '@mozbot.io/prisma'
import { chatsLimits } from '../constants'
import { Workspace } from '@mozbot.io/schemas'

export const getChatsLimit = ({
  plan,
  customChatsLimit,
}: Pick<Workspace, 'plan'> & {
  customChatsLimit?: Workspace['customChatsLimit']
}) => {
  if (
    plan === Plan.UNLIMITED ||
    plan === Plan.LIFETIME ||
    plan === Plan.OFFERED
  )
    return 'inf'
  if (plan === Plan.CUSTOM) return customChatsLimit ?? 'inf'
  return chatsLimits[plan]
}
