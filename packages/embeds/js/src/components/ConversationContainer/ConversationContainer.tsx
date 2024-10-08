import {
  ContinueChatResponse,
  InputBlock,
  Theme,
  ChatLog,
  StartChatResponse,
} from '@mozbot.io/schemas'
import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from 'solid-js'
import { continueChatQuery } from '@/queries/continueChatQuery'
import { ChatChunk } from './ChatChunk'
import {
  Answer,
  BotContext,
  ChatChunk as ChatChunkType,
  OutgoingLog,
} from '@/types'
import { isNotDefined } from '@mozbot.io/lib'
import { executeClientSideAction } from '@/utils/executeClientSideActions'
import { LoadingChunk } from './LoadingChunk'
import { PopupBlockedToast } from './PopupBlockedToast'
import { setStreamingMessage } from '@/utils/streamingMessageSignal'
import {
  formattedMessages,
  setFormattedMessages,
} from '@/utils/formattedMessagesSignal'
import { saveClientLogsQuery } from '@/queries/saveClientLogsQuery'
import { HTTPError } from 'ky'
import { persist } from '@/utils/persist'

const autoScrollBottomToleranceScreenPercent = 0.6
const bottomSpacerHeight = 128

const parseDynamicTheme = (
  initialTheme: Theme,
  dynamicTheme: ContinueChatResponse['dynamicTheme']
): Theme => ({
  ...initialTheme,
  chat: {
    ...initialTheme.chat,
    hostAvatar:
      initialTheme.chat?.hostAvatar && dynamicTheme?.hostAvatarUrl
        ? {
            ...initialTheme.chat.hostAvatar,
            url: dynamicTheme.hostAvatarUrl,
          }
        : initialTheme.chat?.hostAvatar,
    guestAvatar:
      initialTheme.chat?.guestAvatar && dynamicTheme?.guestAvatarUrl
        ? {
            ...initialTheme.chat.guestAvatar,
            url: dynamicTheme?.guestAvatarUrl,
          }
        : initialTheme.chat?.guestAvatar,
  },
})

type Props = {
  initialChatReply: StartChatResponse
  context: BotContext
  onNewInputBlock?: (inputBlock: InputBlock) => void
  onAnswer?: (answer: { message: string; blockId: string }) => void
  onEnd?: () => void
  onNewLogs?: (logs: OutgoingLog[]) => void
  onProgressUpdate?: (progress: number) => void
}

export const ConversationContainer = (props: Props) => {
  let chatContainer: HTMLDivElement | undefined
  const [chatChunks, setChatChunks, isRecovered, setIsRecovered] = persist(
    createSignal<ChatChunkType[]>([
      {
        input: props.initialChatReply.input,
        messages: props.initialChatReply.messages,
        clientSideActions: props.initialChatReply.clientSideActions,
      },
    ]),
    {
      key: `mozbot-${props.context.mozbot.id}-chatChunks`,
      storage: props.context.storage,
      onRecovered: () => {
        setTimeout(() => {
          chatContainer?.scrollTo(0, chatContainer.scrollHeight)
        }, 200)
      },
    }
  )
  const [dynamicTheme, setDynamicTheme] = createSignal<
    ContinueChatResponse['dynamicTheme']
  >(props.initialChatReply.dynamicTheme)
  const [theme, setTheme] = createSignal(props.initialChatReply.mozbot.theme)
  const [isSending, setIsSending] = createSignal(false)
  const [blockedPopupUrl, setBlockedPopupUrl] = createSignal<string>()
  const [hasError, setHasError] = createSignal(false)

  onMount(() => {
    ;(async () => {
      const initialChunk = chatChunks()[0]
      if (!initialChunk.clientSideActions) return
      const actionsBeforeFirstBubble = initialChunk.clientSideActions.filter(
        (action) => isNotDefined(action.lastBubbleBlockId)
      )
      await processClientSideActions(actionsBeforeFirstBubble)
    })()
  })

  const streamMessage = ({ id, message }: { id: string; message: string }) => {
    setIsSending(false)
    const lastChunk = [...chatChunks()].pop()
    if (!lastChunk) return
    if (lastChunk.streamingMessageId !== id)
      setChatChunks((displayedChunks) => [
        ...displayedChunks,
        {
          messages: [],
          streamingMessageId: id,
        },
      ])
    setStreamingMessage({ id, content: message })
  }

  createEffect(() => {
    setTheme(
      parseDynamicTheme(props.initialChatReply.mozbot.theme, dynamicTheme())
    )
  })

  const saveLogs = async (clientLogs?: ChatLog[]) => {
    if (!clientLogs) return
    props.onNewLogs?.(clientLogs)
    if (props.context.isPreview) return
    await saveClientLogsQuery({
      apiHost: props.context.apiHost,
      sessionId: props.initialChatReply.sessionId,
      clientLogs,
    })
  }

  const sendMessage = async (
    message?: string,
    attachments?: Answer['attachments']
  ) => {
    setIsRecovered(false)
    setHasError(false)
    const currentInputBlock = [...chatChunks()].pop()?.input
    if (currentInputBlock?.id && props.onAnswer && message)
      props.onAnswer({ message, blockId: currentInputBlock.id })
    const longRequest = setTimeout(() => {
      setIsSending(true)
    }, 1000)
    autoScrollToBottom()
    const { data, error } = await continueChatQuery({
      apiHost: props.context.apiHost,
      sessionId: props.initialChatReply.sessionId,
      message: message
        ? {
            type: 'text',
            text: message,
            attachedFileUrls: attachments?.map((attachment) => attachment.url),
          }
        : undefined,
    })
    clearTimeout(longRequest)
    setIsSending(false)
    if (error) {
      setHasError(true)
      const errorLogs = [
        {
          description: 'Failed to send the reply',
          details:
            error instanceof HTTPError
              ? {
                  status: error.response.status,
                  body: await error.response.json(),
                }
              : error,
          status: 'error',
        },
      ]
      await saveClientLogsQuery({
        apiHost: props.context.apiHost,
        sessionId: props.initialChatReply.sessionId,
        clientLogs: errorLogs,
      })
      props.onNewLogs?.(errorLogs)
      return
    }
    if (!data) return
    if (data.progress) props.onProgressUpdate?.(data.progress)
    if (data.lastMessageNewFormat) {
      setFormattedMessages([
        ...formattedMessages(),
        {
          inputIndex: [...chatChunks()].length - 1,
          formattedMessage: data.lastMessageNewFormat as string,
        },
      ])
    }
    if (data.logs) props.onNewLogs?.(data.logs)
    if (data.dynamicTheme) setDynamicTheme(data.dynamicTheme)
    if (data.input && props.onNewInputBlock) {
      props.onNewInputBlock(data.input)
    }
    if (data.clientSideActions) {
      const actionsBeforeFirstBubble = data.clientSideActions.filter((action) =>
        isNotDefined(action.lastBubbleBlockId)
      )
      await processClientSideActions(actionsBeforeFirstBubble)
      if (
        data.clientSideActions.length === 1 &&
        data.clientSideActions[0].type === 'stream' &&
        data.messages.length === 0 &&
        data.input === undefined
      )
        return
    }
    setChatChunks((displayedChunks) => [
      ...displayedChunks,
      {
        input: data.input,
        messages: data.messages,
        clientSideActions: data.clientSideActions,
      },
    ])
  }

  const autoScrollToBottom = (lastElement?: HTMLDivElement, offset = 0) => {
    if (!chatContainer) return

    const bottomTolerance =
      chatContainer.clientHeight * autoScrollBottomToleranceScreenPercent -
      bottomSpacerHeight

    const isBottomOfLastElementInView =
      chatContainer.scrollTop + chatContainer.clientHeight >=
      chatContainer.scrollHeight - bottomTolerance

    if (isBottomOfLastElementInView) {
      setTimeout(() => {
        chatContainer?.scrollTo(
          0,
          lastElement
            ? lastElement.offsetTop - offset
            : chatContainer.scrollHeight
        )
      }, 50)
    }
  }

  const handleAllBubblesDisplayed = async () => {
    const lastChunk = [...chatChunks()].pop()
    if (!lastChunk) return
    if (isNotDefined(lastChunk.input)) {
      props.onEnd?.()
    }
  }

  const handleNewBubbleDisplayed = async (blockId: string) => {
    const lastChunk = [...chatChunks()].pop()
    if (!lastChunk) return
    if (lastChunk.clientSideActions) {
      const actionsToExecute = lastChunk.clientSideActions.filter(
        (action) => action.lastBubbleBlockId === blockId
      )
      await processClientSideActions(actionsToExecute)
    }
  }

  const processClientSideActions = async (
    actions: NonNullable<ContinueChatResponse['clientSideActions']>
  ) => {
    if (isRecovered()) return
    for (const action of actions) {
      if (
        'streamOpenAiChatCompletion' in action ||
        'webhookToExecute' in action ||
        'stream' in action
      )
        setIsSending(true)
      const response = await executeClientSideAction({
        clientSideAction: action,
        context: {
          apiHost: props.context.apiHost,
          sessionId: props.initialChatReply.sessionId,
        },
        onMessageStream: streamMessage,
      })
      if (response && 'logs' in response) saveLogs(response.logs)
      if (response && 'replyToSend' in response) {
        setIsSending(false)
        sendMessage(response.replyToSend)
        return
      }
      if (response && 'blockedPopupUrl' in response)
        setBlockedPopupUrl(response.blockedPopupUrl)
    }
  }

  onCleanup(() => {
    setStreamingMessage(undefined)
    setFormattedMessages([])
  })

  const handleSkip = () => sendMessage(undefined)

  return (
    <div
      ref={chatContainer}
      class="flex flex-col overflow-y-auto w-full px-3 pt-10 relative scrollable-container mozbot-chat-view scroll-smooth gap-2"
    >
      <For each={chatChunks()}>
        {(chatChunk, index) => (
          <ChatChunk
            index={index()}
            messages={chatChunk.messages}
            input={chatChunk.input}
            theme={theme()}
            settings={props.initialChatReply.mozbot.settings}
            streamingMessageId={chatChunk.streamingMessageId}
            context={props.context}
            hideAvatar={
              !chatChunk.input &&
              ((chatChunks()[index() + 1]?.messages ?? 0).length > 0 ||
                chatChunks()[index() + 1]?.streamingMessageId !== undefined ||
                (chatChunk.messages.length > 0 && isSending()))
            }
            hasError={hasError() && index() === chatChunks().length - 1}
            isTransitionDisabled={index() !== chatChunks().length - 1}
            onNewBubbleDisplayed={handleNewBubbleDisplayed}
            onAllBubblesDisplayed={handleAllBubblesDisplayed}
            onSubmit={sendMessage}
            onScrollToBottom={autoScrollToBottom}
            onSkip={handleSkip}
          />
        )}
      </For>
      <Show when={isSending()}>
        <LoadingChunk theme={theme()} />
      </Show>
      <Show when={blockedPopupUrl()} keyed>
        {(blockedPopupUrl) => (
          <div class="flex justify-end">
            <PopupBlockedToast
              url={blockedPopupUrl}
              onLinkClick={() => setBlockedPopupUrl(undefined)}
            />
          </div>
        )}
      </Show>
      <BottomSpacer />
    </div>
  )
}

const BottomSpacer = () => (
  <div
    class="w-full flex-shrink-0 mozbot-bottom-spacer"
    style={{ height: bottomSpacerHeight + 'px' }}
  />
)
