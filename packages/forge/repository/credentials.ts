import { anthropicBlock } from '@mozbot.io/anthropic-block'
import { anthropicCredentialsSchema } from '@mozbot.io/anthropic-block/schemas'
import { chatNodeBlock } from '@mozbot.io/chat-node-block'
import { chatNodeCredentialsSchema } from '@mozbot.io/chat-node-block/schemas'
import { difyAiBlock } from '@mozbot.io/dify-ai-block'
import { difyAiCredentialsSchema } from '@mozbot.io/dify-ai-block/schemas'
import { elevenlabsBlock } from '@mozbot.io/elevenlabs-block'
import { elevenlabsCredentialsSchema } from '@mozbot.io/elevenlabs-block/schemas'
import { mistralBlock } from '@mozbot.io/mistral-block'
import { mistralCredentialsSchema } from '@mozbot.io/mistral-block/schemas'
import { openRouterBlock } from '@mozbot.io/open-router-block'
import { openRouterCredentialsSchema } from '@mozbot.io/open-router-block/schemas'
import { openAIBlock } from '@mozbot.io/openai-block'
import { openAICredentialsSchema } from '@mozbot.io/openai-block/schemas'
import { togetherAiBlock } from '@mozbot.io/together-ai-block'
import { togetherAiCredentialsSchema } from '@mozbot.io/together-ai-block/schemas'
import { nocodbBlock } from '@mozbot.io/nocodb-block'
import { nocodbCredentialsSchema } from '@mozbot.io/nocodb-block/schemas'

export const forgedCredentialsSchemas = {
  [openAIBlock.id]: openAICredentialsSchema,
  [chatNodeBlock.id]: chatNodeCredentialsSchema,
  [difyAiBlock.id]: difyAiCredentialsSchema,
  [mistralBlock.id]: mistralCredentialsSchema,
  [elevenlabsBlock.id]: elevenlabsCredentialsSchema,
  [anthropicBlock.id]: anthropicCredentialsSchema,
  [togetherAiBlock.id]: togetherAiCredentialsSchema,
  [openRouterBlock.id]: openRouterCredentialsSchema,
  [nocodbBlock.id]: nocodbCredentialsSchema,
}
