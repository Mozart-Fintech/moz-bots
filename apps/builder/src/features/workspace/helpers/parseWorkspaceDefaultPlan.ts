import { env } from '@mozbot.io/env'
import { Plan } from '@mozbot.io/prisma'

export const parseWorkspaceDefaultPlan = (userEmail: string) => {
  if (env.ADMIN_EMAIL?.some((email) => email === userEmail))
    return Plan.UNLIMITED
  const defaultPlan = env.DEFAULT_WORKSPACE_PLAN as Plan
  if (defaultPlan && Object.values(Plan).includes(defaultPlan))
    return defaultPlan
  return Plan.FREE
}
