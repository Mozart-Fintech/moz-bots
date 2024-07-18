import {
  CollaborationType,
  CollaboratorsOnMozbots,
  MemberInWorkspace,
  User,
  Workspace,
} from '@mozbot.io/prisma'

export const isWriteMozbotForbidden = async (
  mozbot: {
    collaborators: Pick<CollaboratorsOnMozbots, 'userId' | 'type'>[]
  } & {
    workspace: Pick<Workspace, 'isSuspended' | 'isPastDue'> & {
      members: Pick<MemberInWorkspace, 'userId' | 'role'>[]
    }
  },
  user: Pick<User, 'id'>
) => {
  return (
    mozbot.workspace.isSuspended ||
    mozbot.workspace.isPastDue ||
    (!mozbot.collaborators.some(
      (collaborator) =>
        collaborator.userId === user.id &&
        collaborator.type === CollaborationType.WRITE
    ) &&
      !mozbot.workspace.members.some(
        (m) => m.userId === user.id && m.role !== 'GUEST'
      ))
  )
}
