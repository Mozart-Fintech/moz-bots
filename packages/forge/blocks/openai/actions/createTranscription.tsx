import { option, createAction } from '@mozbot.io/forge'
import { defaultOpenAIOptions } from '../constants'
import OpenAI, { ClientOptions, toFile } from 'openai'
import { isNotEmpty } from '@mozbot.io/lib'
import { getFileFromBucket } from '@mozbot.io/lib/s3/getFileFromBucket'
import { auth } from '../auth'
import { baseOptions } from '../baseOptions'

export const createTranscription = createAction({
  name: 'Create transcription',
  auth,
  baseOptions,
  options: option.object({
    model: option.string.layout({
      fetcher: 'fetchTranscriptionModels',
      defaultValue: 'whisper-1',
      placeholder: 'Select a model',
    }),
    url: option.string.layout({
      inputType: 'variableDropdown',
      label: 'Url',
    }),
    saveTextInVariableId: option.string.layout({
      inputType: 'variableDropdown',
      label: 'Save text in variable',
    }),
  }),
  getSetVariableIds: (options) =>
    options.saveTextInVariableId ? [options.saveTextInVariableId] : [],
  fetchers: [
    {
      id: 'fetchTranscriptionModels',
      dependencies: ['baseUrl', 'apiVersion'],
      fetch: async ({ credentials, options }) => {
        if (!credentials?.apiKey) return []

        const baseUrl = options?.baseUrl ?? defaultOpenAIOptions.baseUrl
        const config = {
          apiKey: credentials.apiKey,
          baseURL: baseUrl ?? defaultOpenAIOptions.baseUrl,
          defaultHeaders: {
            'api-key': credentials.apiKey,
          },
          defaultQuery: options?.apiVersion
            ? {
              'api-version': options.apiVersion,
            }
            : undefined,
        } satisfies ClientOptions

        const openai = new OpenAI(config)

        const models = await openai.models.list()
        console.log(models)

        return (
          models.data
            .filter((model) => model.id.includes('whisper'))
            .sort((a, b) => b.created - a.created)
            .map((model) => model.id) ?? []
        )
      },
    },
  ],
  run: {
    server: async ({ credentials: { apiKey }, options, variables, logs }) => {
      if (!options.url) return logs.add('Create transcription url is empty')
      if (!options.saveTextInVariableId)
        return logs.add('Create transcription save variable is empty')

      const config = {
        apiKey,
        baseURL: options.baseUrl ?? defaultOpenAIOptions.baseUrl,
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

      const model = options.model ?? defaultOpenAIOptions.transcriptModel

      const fetchUrl = await fetch(variables.get(options.url) as string)

      const blob = await fetchUrl.blob()

      const buffer = await blob.arrayBuffer()

      const file = await toFile(buffer)

      const transcriptionText = (await openai.audio.transcriptions.create({
        file,
        model,
      })).text

      variables.set(options.saveTextInVariableId, transcriptionText)
    },
  },
})
