import { env } from '@mozbot.io/env'
import {
  CollaboratorsOnMozbots,
  User,
  Workspace,
  MemberInWorkspace,
  Mozbot,
} from '@mozbot.io/prisma'
import { settingsSchema } from '@mozbot.io/schemas'

export const isReadMozbotForbidden = async (
  mozbot: {
    settings?: Mozbot['settings']
    collaborators: Pick<CollaboratorsOnMozbots, 'userId'>[]
  } & {
    workspace: Pick<Workspace, 'isSuspended' | 'isPastDue'> & {
      members: Pick<MemberInWorkspace, 'userId'>[]
    }
  },
  user?: Pick<User, 'email' | 'id'>
) => {
  const settings = mozbot.settings
    ? settingsSchema.parse(mozbot.settings)
    : undefined
  const isMozbotPublic = settings?.publicShare?.isEnabled === true
  if (isMozbotPublic) return false
  return (
    !user ||
    mozbot.workspace.isSuspended ||
    mozbot.workspace.isPastDue ||
    (env.ADMIN_EMAIL?.every((email) => email !== user.email) &&
      !mozbot.collaborators.some(
        (collaborator) => collaborator.userId === user.id
      ) &&
      !mozbot.workspace.members.some((member) => member.userId === user.id))
  )
}
