import { ContinueChatResponse, StartChatResponse } from '@mozbot.io/schemas'

export type InputSubmitContent = {
  label?: string
  value: string
  attachments?: Answer['attachments']
}

export type BotContext = {
  mozbot: StartChatResponse['mozbot']
  resultId?: string
  isPreview: boolean
  apiHost?: string
  sessionId: string
  storage: 'local' | 'session' | undefined
}

export type OutgoingLog = {
  status: string
  description: string
  details?: unknown
}

export type ClientSideActionContext = {
  apiHost?: string
  sessionId: string
}

export type ChatChunk = Pick<
  ContinueChatResponse,
  'messages' | 'input' | 'clientSideActions'
> & {
  streamingMessageId?: string
}

export type Answer = {
  text: string
  attachments?: {
    type: string
    url: string
  }[]
}
