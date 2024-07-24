import { OpenAILightLogo, OpenAIDarkLogo } from './logo'
import { createChatCompletion } from './actions/createChatCompletion'
import { createSpeech } from './actions/createSpeech'
import { createTranscription } from './actions/createTranscription'
import { createBlock } from '@mozbot.io/forge'
import { auth } from './auth'
import { baseOptions } from './baseOptions'
import { askAssistant } from './actions/askAssistant'
import { generateVariables } from './actions/generateVariables'

export const openAIBlock = createBlock({
  id: 'openai' as const,
  name: 'OpenAI',
  tags: ['openai'],
  LightLogo: OpenAILightLogo,
  DarkLogo: OpenAIDarkLogo,
  auth,
  options: baseOptions,
  actions: [
    createChatCompletion,
    askAssistant,
    generateVariables,
    createSpeech,
    createTranscription,
  ],
  docsUrl: 'https://docs.mozbot.io/forge/blocks/openai',
})
