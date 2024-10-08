import { Connection } from '@planetscale/database'
import { decryptV2 } from '@mozbot.io/lib/api/encryption/decryptV2'
import { isNotEmpty } from '@mozbot.io/lib/utils'
import {
  ChatCompletionOpenAIOptions,
  OpenAICredentials,
} from '@mozbot.io/schemas/features/blocks/integrations/openai'
import { SessionState } from '@mozbot.io/schemas/features/chat/sessionState'
import { OpenAIStream } from 'ai'
import { parseVariableNumber } from '@mozbot.io/variables/parseVariableNumber'
import { ClientOptions, OpenAI } from 'openai'
import { defaultOpenAIOptions } from '@mozbot.io/schemas/features/blocks/integrations/openai/constants'

export const getChatCompletionStream =
  (conn: Connection) =>
  async (
    state: SessionState,
    options: ChatCompletionOpenAIOptions,
    messages: OpenAI.Chat.ChatCompletionMessageParam[]
  ) => {
    if (!options.credentialsId) return
    const credentials = (
      await conn.execute('select data, iv from Credentials where id=?', [
        options.credentialsId,
      ])
    ).rows.at(0) as { data: string; iv: string } | undefined
    if (!credentials) {
      console.error('Could not find credentials in database')
      return
    }
    const { apiKey } = (await decryptV2(
      credentials.data,
      credentials.iv
    )) as OpenAICredentials['data']

    const { mozbot } = state.mozbotsQueue[0]
    const temperature = parseVariableNumber(mozbot.variables)(
      options.advancedSettings?.temperature
    )

    const config = {
      apiKey,
      baseURL: options.baseUrl,
      defaultHeaders: {
        'api-key': apiKey,
      },
      defaultQuery: isNotEmpty(options.apiVersion)
        ? {
            'api-version': options.apiVersion,
          }
        : undefined,
    } satisfies ClientOptions

    const openai = new OpenAI(config)

    const response = await openai.chat.completions.create({
      model: options.model ?? defaultOpenAIOptions.model,
      temperature,
      stream: true,
      messages,
    })

    return OpenAIStream(response)
  }
