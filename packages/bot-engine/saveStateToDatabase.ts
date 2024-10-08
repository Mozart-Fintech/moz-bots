import {
  ContinueChatResponse,
  ChatSession,
  SetVariableHistoryItem,
} from '@mozbot.io/schemas'
import { upsertResult } from './queries/upsertResult'
import { updateSession } from './queries/updateSession'
import { createSession } from './queries/createSession'
import { deleteSession } from './queries/deleteSession'
import { Prisma, VisitedEdge } from '@mozbot.io/prisma'
import prisma from '@mozbot.io/lib/prisma'

type Props = {
  session: Pick<ChatSession, 'state'> & { id?: string }
  input: ContinueChatResponse['input']
  logs: ContinueChatResponse['logs']
  clientSideActions: ContinueChatResponse['clientSideActions']
  visitedEdges: VisitedEdge[]
  setVariableHistory: SetVariableHistoryItem[]
  hasEmbedBubbleWithWaitEvent?: boolean
  initialSessionId?: string
}

export const saveStateToDatabase = async ({
  session: { state, id },
  input,
  logs,
  clientSideActions,
  visitedEdges,
  setVariableHistory,
  hasEmbedBubbleWithWaitEvent,
  initialSessionId,
}: Props) => {
  const containsSetVariableClientSideAction = clientSideActions?.some(
    (action) => action.expectsDedicatedReply
  )

  const isCompleted = Boolean(
    !input &&
      !containsSetVariableClientSideAction &&
      !hasEmbedBubbleWithWaitEvent
  )

  const queries: Prisma.PrismaPromise<any>[] = []

  const resultId = state.mozbotsQueue[0].resultId

  if (id) {
    if (isCompleted && resultId) queries.push(deleteSession(id))
    else queries.push(updateSession({ id, state, isReplying: false }))
  }

  const session = id
    ? { state, id }
    : await createSession({ id: initialSessionId, state, isReplying: false })

  if (!resultId) {
    if (queries.length > 0) await prisma.$transaction(queries)
    return session
  }

  const answers = state.mozbotsQueue[0].answers

  queries.push(
    upsertResult({
      resultId,
      mozbot: state.mozbotsQueue[0].mozbot,
      isCompleted: Boolean(
        !input && !containsSetVariableClientSideAction && answers.length > 0
      ),
      hasStarted: answers.length > 0,
      lastChatSessionId: session.id,
      logs,
      visitedEdges,
      setVariableHistory,
    })
  )

  await prisma.$transaction(queries)

  return session
}
