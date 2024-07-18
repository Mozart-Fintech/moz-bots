import { Message, StartFrom, StartMozbot } from '@mozbot.io/schemas'
import { restartSession } from '../queries/restartSession'
import { saveStateToDatabase } from '../saveStateToDatabase'
import { startSession } from '../startSession'
import { computeCurrentProgress } from '../computeCurrentProgress'
import { BubbleBlockType } from '@mozbot.io/schemas/features/blocks/bubbles/constants'

type Props = {
  message?: Message
  isOnlyRegistering: boolean
  isStreamEnabled: boolean
  startFrom?: StartFrom
  mozbotId: string
  mozbot?: StartMozbot
  userId?: string
  prefilledVariables?: Record<string, unknown>
  sessionId?: string
  textBubbleContentFormat: 'richText' | 'markdown'
}

export const startChatPreview = async ({
  message,
  isOnlyRegistering,
  isStreamEnabled,
  startFrom,
  mozbotId,
  mozbot: startMozbot,
  userId,
  prefilledVariables,
  sessionId,
  textBubbleContentFormat,
}: Props) => {
  const {
    mozbot,
    messages,
    input,
    dynamicTheme,
    logs,
    clientSideActions,
    newSessionState,
    visitedEdges,
    setVariableHistory,
  } = await startSession({
    version: 2,
    startParams: {
      type: 'preview',
      isOnlyRegistering,
      isStreamEnabled,
      startFrom,
      mozbotId,
      mozbot: startMozbot,
      userId,
      prefilledVariables,
      sessionId,
      textBubbleContentFormat,
      message,
    },
  })

  const session = isOnlyRegistering
    ? await restartSession({
        state: newSessionState,
      })
    : await saveStateToDatabase({
        session: {
          state: newSessionState,
        },
        input,
        logs,
        clientSideActions,
        visitedEdges,
        setVariableHistory,
        hasEmbedBubbleWithWaitEvent: messages.some(
          (message) =>
            message.type === 'custom-embed' ||
            (message.type === BubbleBlockType.EMBED &&
              message.content.waitForEvent?.isEnabled)
        ),
        initialSessionId: sessionId,
      })

  const isEnded =
    newSessionState.progressMetadata &&
    !input?.id &&
    (clientSideActions?.filter((c) => c.expectsDedicatedReply).length ?? 0) ===
      0

  return {
    sessionId: session.id,
    mozbot: {
      id: mozbot.id,
      theme: mozbot.theme,
      settings: mozbot.settings,
    },
    messages,
    input,
    dynamicTheme,
    logs,
    clientSideActions,
    progress: newSessionState.progressMetadata
      ? isEnded
        ? 100
        : computeCurrentProgress({
            mozbotsQueue: newSessionState.mozbotsQueue,
            progressMetadata: newSessionState.progressMetadata,
            currentInputBlockId: input?.id,
          })
      : undefined,
  }
}
