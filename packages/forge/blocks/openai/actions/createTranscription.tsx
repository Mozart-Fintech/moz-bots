import { option, createAction } from '@mozbot.io/forge'
import { defaultOpenAIOptions } from '../constants'
import OpenAI, { ClientOptions, toFile } from 'openai'
import { isNotEmpty } from '@mozbot.io/lib'
import { Readable, Writable } from 'stream';
import audioDecode from 'audio-decode';
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

      const convertToWav = async (inputBuffer: ArrayBuffer): Promise<Buffer> => {
        try {
          const audioBuffer = await audioDecode(inputBuffer)
          const wavBuffer = audioBufferToWav(audioBuffer)
          return Buffer.from(wavBuffer)
        } catch (error) {
          throw new Error(`Error decoding audio: ${error}`)
        }
      }

      const audioBufferToWav = (audioBuffer: AudioBuffer): ArrayBuffer => {
        const numOfChan = audioBuffer.numberOfChannels,
          length = audioBuffer.length * numOfChan * 2 + 44,
          buffer = new ArrayBuffer(length),
          view = new DataView(buffer),
          channels = [],
          sampleRate = audioBuffer.sampleRate,
          bitDepth = 16

        let offset = 0

        writeString(view, offset, 'RIFF'); offset += 4
        view.setUint32(offset, 36 + audioBuffer.length * numOfChan * 2, true); offset += 4
        writeString(view, offset, 'WAVE'); offset += 4
        writeString(view, offset, 'fmt '); offset += 4
        view.setUint32(offset, 16, true); offset += 4
        view.setUint16(offset, 1, true); offset += 2
        view.setUint16(offset, numOfChan, true); offset += 2
        view.setUint32(offset, sampleRate, true); offset += 4
        view.setUint32(offset, sampleRate * numOfChan * 2, true); offset += 4
        view.setUint16(offset, numOfChan * 2, true); offset += 2
        view.setUint16(offset, bitDepth, true); offset += 2
        writeString(view, offset, 'data'); offset += 4
        view.setUint32(offset, audioBuffer.length * numOfChan * 2, true); offset += 4

        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
          channels.push(audioBuffer.getChannelData(i))
        }

        let interleaved = interleave(channels)

        for (let i = 0; i < interleaved.length; i++, offset += 2) {
          view.setInt16(offset, interleaved[i] * 0x7FFF, true)
        }

        return buffer
      }

      const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i))
        }
      }

      const interleave = (channels: Float32Array[]) => {
        let length = channels[0].length
        let result = new Float32Array(length * channels.length)
        let index = 0, inputIndex = 0

        while (index < result.length) {
          for (let i = 0; i < channels.length; i++) {
            result[index++] = channels[i][inputIndex]
          }
          inputIndex++
        }
        return result
      }

      const openai = new OpenAI(config)

      const model = options.model ?? defaultOpenAIOptions.transcriptModel

      const fetchUrl = await fetch(variables.get(options.url) as string)

      const blob = await fetchUrl.blob()

      const buffer = await blob.arrayBuffer()

      const wavBuffer = await convertToWav(buffer)

      const file = await toFile(wavBuffer, Math.floor(Math.random() * 99999999999) + '.wav')

      const transcriptionText = (await openai.audio.transcriptions.create({
        file,
        model,
      })).text

      variables.set(options.saveTextInVariableId, transcriptionText)
    },
  },
})
