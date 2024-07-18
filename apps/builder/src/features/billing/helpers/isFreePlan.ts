import { isNotDefined } from '@mozbot.io/lib'
import { Workspace, Plan } from '@mozbot.io/prisma'

export const isFreePlan = (workspace?: Pick<Workspace, 'plan'>) =>
  isNotDefined(workspace) || workspace?.plan === Plan.FREE
