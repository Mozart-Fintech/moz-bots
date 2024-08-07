// Do not edit this file manually
import { parseBlockCredentials, parseBlockSchema } from '@mozbot.io/forge'
import { mistralBlock } from '.'
import { auth } from './auth'

export const mistralBlockSchema = parseBlockSchema(mistralBlock)
export const mistralCredentialsSchema = parseBlockCredentials(
  mistralBlock.id,
  auth.schema
)
