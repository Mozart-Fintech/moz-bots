import { isDefined } from '@mozbot.io/lib'
import { ChatCompletionOptions } from './parseChatCompletionOptions'

export const getChatCompletionSetVarIds = (options: ChatCompletionOptions) =>
  options.responseMapping?.map((res) => res.variableId).filter(isDefined) ?? []
