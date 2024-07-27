import { createBlock } from '@mozbot.io/forge'
import { MistralLogo } from './logo'
import { auth } from './auth'
import { createChatCompletion } from './actions/createChatCompletion'
import { generateVariables } from './actions/generateVariables'

export const mistralBlock = createBlock({
  id: 'mistral',
  name: 'Mistral',
  tags: ['ai', 'chat', 'completion'],
  LightLogo: MistralLogo,
  auth,
  actions: [createChatCompletion, generateVariables],
  docsUrl: 'https://mozdocs.mozartfintech.com/forge/blocks/mistral',
})
