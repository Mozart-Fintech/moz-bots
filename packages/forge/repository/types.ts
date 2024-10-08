import { z } from '@mozbot.io/forge/zod'
import { forgedBlocks } from './definitions'
import { forgedBlockSchemas } from './schemas'

export type ForgedBlock = z.infer<
  (typeof forgedBlockSchemas)[keyof typeof forgedBlockSchemas]
>

export type ForgedBlockDefinition =
  (typeof forgedBlocks)[keyof typeof forgedBlocks]
