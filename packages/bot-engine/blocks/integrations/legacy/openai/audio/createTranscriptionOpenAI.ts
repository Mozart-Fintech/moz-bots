import { SessionState } from '@mozbot.io/schemas'
import {
  CreateTranscriptionOpenAIOptions,
  OpenAICredentials,
} from '@mozbot.io/schemas/features/blocks/integrations/openai'
import { isNotEmpty } from '@mozbot.io/lib'
import { decrypt } from '@mozbot.io/lib/api/encryption/decrypt'
import prisma from '@mozbot.io/lib/prisma'
import { defaultOpenAIOptions } from '@mozbot.io/schemas/features/blocks/integrations/openai/constants'
import { ExecuteIntegrationResponse } from '../../../../../types'
import OpenAI, { ClientOptions, toFile } from 'openai'
import { getFileFromBucket } from '@mozbot.io/lib/s3/getFileFromBucket'
import { updateVariablesInSession } from '@mozbot.io/variables/updateVariablesInSession'
import { parseVariables } from '@mozbot.io/variables/parseVariables'

export const createTranscriptionOpenAI = async (
  state: SessionState,
  {
    outgoingEdgeId,
    options,
  }: {
    outgoingEdgeId?: string
    options: CreateTranscriptionOpenAIOptions
  }
): Promise<ExecuteIntegrationResponse> => {
  let newSessionState = state
  const noCredentialsError = {
    status: 'error',
    description: 'Make sure to select an OpenAI account',
  }

  if (!options.url || !options.model || !options.saveTextInVariableId) {
    return {
      outgoingEdgeId,
      logs: [
        {
          status: 'error',
          description:
            'Make sure to enter an URL, select a model and select a variable to save the text in',
        },
      ],
    }
  }

  if (!options.credentialsId) {
    return {
      outgoingEdgeId,
      logs: [noCredentialsError],
    }
  }
  const credentials = await prisma.credentials.findUnique({
    where: {
      id: options.credentialsId,
    },
  })
  if (!credentials) {
    console.error('Could not find credentials in database')
    return { outgoingEdgeId, logs: [noCredentialsError] }
  }
  const { apiKey } = (await decrypt(
    credentials.data,
    credentials.iv
  )) as OpenAICredentials['data']

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

  const variables = newSessionState.mozbotsQueue[0].mozbot.variables
  const saveTextInVariable = variables.find(
    (v) => v.id === options.saveTextInVariableId
  )

  if (!saveTextInVariable) {
    return {
      outgoingEdgeId,
      logs: [
        {
          status: 'error',
          description: 'Could not find variable with this id to update',
        },
      ],
    }
  }

  const file = await toFile(
    await getFileFromBucket({
      url: parseVariables(variables)(options.url),
    })
  )

  const transcriptionText = (
    await openai.audio.transcriptions.create({
      file: file,
      model: options.model as 'whisper-1',
    })
  ).text

  newSessionState = updateVariablesInSession({
    newVariables: [
      {
        ...saveTextInVariable,
        value: transcriptionText,
      },
    ],
    state: newSessionState,
    currentBlockId: undefined,
  }).updatedState

  return {
    startTimeShouldBeUpdated: true,
    outgoingEdgeId,
    newSessionState,
  }
}
