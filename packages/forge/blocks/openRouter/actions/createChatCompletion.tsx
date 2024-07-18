import { createAction } from '@mozbot.io/forge'
import { auth } from '../auth'
import { parseChatCompletionOptions } from '@mozbot.io/openai-block/shared/parseChatCompletionOptions'
import { getChatCompletionSetVarIds } from '@mozbot.io/openai-block/shared/getChatCompletionSetVarIds'
import { getChatCompletionStreamVarId } from '@mozbot.io/openai-block/shared/getChatCompletionStreamVarId'
import { runOpenAIChatCompletion } from '@mozbot.io/openai-block/shared/runOpenAIChatCompletion'
import { runOpenAIChatCompletionStream } from '@mozbot.io/openai-block/shared/runOpenAIChatCompletionStream'
import { defaultOpenRouterOptions } from '../constants'
import ky from 'ky'
import { ModelsResponse } from '../types'

export const createChatCompletion = createAction({
  name: 'Create chat completion',
  auth,
  turnableInto: [
    {
      blockId: 'openai',
    },
    {
      blockId: 'together-ai',
    },
    { blockId: 'mistral' },
    {
      blockId: 'anthropic',
      transform: (options) => ({
        ...options,
        action: 'Create Chat Message',
        responseMapping: options.responseMapping?.map((res: any) =>
          res.item === 'Message content'
            ? { ...res, item: 'Message Content' }
            : res
        ),
      }),
    },
  ],
  options: parseChatCompletionOptions({
    modelFetchId: 'fetchModels',
    defaultTemperature: defaultOpenRouterOptions.temperature,
  }),
  getSetVariableIds: getChatCompletionSetVarIds,
  fetchers: [
    {
      id: 'fetchModels',
      dependencies: [],
      fetch: async () => {
        const response = await ky
          .get(defaultOpenRouterOptions.baseUrl + '/models')
          .json<ModelsResponse>()

        return response.data.map((model) => ({
          value: model.id,
          label: model.name,
        }))
      },
    },
  ],
  run: {
    server: (params) =>
      runOpenAIChatCompletion({
        ...params,
        config: { baseUrl: defaultOpenRouterOptions.baseUrl },
      }),
    stream: {
      getStreamVariableId: getChatCompletionStreamVarId,
      run: async (params) =>
        runOpenAIChatCompletionStream({
          ...params,
          config: {
            baseUrl: defaultOpenRouterOptions.baseUrl,
          },
        }),
    },
  },
})
