import { TRPCError } from '@trpc/server'
import prisma from '@mozbot.io/lib/prisma'
import {
  SessionState,
  Variable,
  PublicMozbot,
  Mozbot,
} from '@mozbot.io/schemas'
import { getSession } from '../queries/getSession'

type Props = {
  user?: { id: string }
  sessionId: string
}

export const updateMozbotInSession = async ({ user, sessionId }: Props) => {
  if (!user)
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })
  const session = await getSession(sessionId)
  if (!session)
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })

  const publicMozbot = (await prisma.publicMozbot.findFirst({
    where: {
      mozbot: {
        id: session.state.mozbotsQueue[0].mozbot.id,
        OR: [
          {
            workspace: {
              members: {
                some: { userId: user.id, role: { in: ['ADMIN', 'MEMBER'] } },
              },
            },
          },
          {
            collaborators: {
              some: { userId: user.id, type: { in: ['WRITE'] } },
            },
          },
        ],
      },
    },
    select: {
      edges: true,
      groups: true,
      variables: true,
    },
  })) as Pick<PublicMozbot, 'edges' | 'variables' | 'groups'> | null

  if (!publicMozbot)
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })

  const newSessionState = updateSessionState(session.state, publicMozbot)

  await prisma.chatSession.updateMany({
    where: { id: session.id },
    data: { state: newSessionState },
  })

  return { message: 'success' } as const
}

const updateSessionState = (
  currentState: SessionState,
  newMozbot: Pick<PublicMozbot, 'edges' | 'variables' | 'groups'>
): SessionState => ({
  ...currentState,
  mozbotsQueue: currentState.mozbotsQueue.map((mozbotInQueue, index) =>
    index === 0
      ? {
          ...mozbotInQueue,
          mozbot: {
            ...mozbotInQueue.mozbot,
            edges: newMozbot.edges,
            groups: newMozbot.groups,
            variables: updateVariablesInSession(
              mozbotInQueue.mozbot.variables,
              newMozbot.variables
            ),
          },
        }
      : mozbotInQueue
  ) as SessionState['mozbotsQueue'],
})

const updateVariablesInSession = (
  currentVariables: Variable[],
  newVariables: Mozbot['variables']
): Variable[] => [
  ...currentVariables,
  ...newVariables.filter(
    (newVariable) =>
      !currentVariables.find(
        (currentVariable) => currentVariable.id === newVariable.id
      )
  ),
]
