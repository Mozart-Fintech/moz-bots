import { z } from '../../../zod'
import {
  chatLogSchema,
  chatMessageSchema,
  runtimeOptionsSchema,
  startMozbotSchema,
} from '../schema'
import { mozbotV5Schema, mozbotV6Schema } from '../../mozbot'
import { dynamicThemeSchema } from '../shared'
import { inputBlockSchemas } from '../../blocks'
import { extendZodWithOpenApi } from 'zod-openapi'
import { clientSideActionSchema } from '../clientSideAction'

extendZodWithOpenApi(z)

export const startElementIdSchema = z.union([
  z.object({
    startGroupId: z.string().describe('Start chat from a specific group.'),
    startEventId: z.never().optional().openapi({
      type: 'string',
    }),
  }),
  z.object({
    startEventId: z.string().describe('Start chat from a specific event.'),
    startGroupId: z.never().optional().openapi({
      type: 'string',
    }),
  }),
  z.object({}),
])
export type StartElementId = z.infer<typeof startElementIdSchema>

const startParamsSchema = z
  .object({
    mozbot: startMozbotSchema
      .or(z.string())
      .describe(
        'Either a Mozbot ID or a Mozbot object. If you provide a Mozbot object, it will be executed in preview mode. ([How can I find my mozbot ID?](https://mozdocs.mozartfintech.com/api-reference#how-to-find-my-mozbotId)).'
      ),
    isPreview: z
      .boolean()
      .optional()
      .describe(
        "If set to `true`, it will start a Preview session with the unpublished bot and it won't be saved in the Results tab. You need to be authenticated with a bearer token for this to work."
      ),
    resultId: z
      .string()
      .optional()
      .describe("Provide it if you'd like to overwrite an existing result."),

    prefilledVariables: z
      .record(z.unknown())
      .optional()
      .describe(
        '[More info about prefilled variables.](https://mozdocs.mozartfintech.com/editor/variables#prefilled-variables)'
      ),
    isStreamEnabled: z
      .boolean()
      .optional()
      .describe(
        'Set this to `true` if you intend to stream OpenAI completions on a client.'
      ),
    isOnlyRegistering: z
      .boolean()
      .optional()
      .describe(
        'If set to `true`, it will only register the session and not start the chat. This is used for other chat platform integration as it can require a session to be registered before sending the first message.'
      ),
  })
  .and(startElementIdSchema)

export const sendMessageInputSchema = z.object({
  message: z
    .string()
    .optional()
    .describe(
      'The answer to the previous chat input. Do not provide it if you are starting a new chat.'
    ),
  sessionId: z
    .string()
    .optional()
    .describe(
      'Session ID that you get from the initial chat request to a bot. If not provided, it will create a new session.'
    ),
  startParams: startParamsSchema.optional(),
  clientLogs: z
    .array(chatLogSchema)
    .optional()
    .describe('Logs while executing client side actions'),
})

export const chatReplySchema = z.object({
  messages: z.array(chatMessageSchema),
  input: z
    .union([
      z.discriminatedUnion('type', [...inputBlockSchemas.v5]),
      z.discriminatedUnion('type', [...inputBlockSchemas.v6]),
    ])
    .and(
      z.object({
        prefilledValue: z.string().optional(),
        runtimeOptions: runtimeOptionsSchema.optional(),
      })
    )
    .optional(),
  clientSideActions: z.array(clientSideActionSchema).optional(),
  sessionId: z.string().optional(),
  mozbot: z
    .object({
      id: z.string(),
      theme: z.union([
        mozbotV5Schema._def.schema.shape.theme,
        mozbotV6Schema.shape.theme,
      ]),
      settings: z.union([
        mozbotV5Schema._def.schema.shape.settings,
        mozbotV6Schema.shape.settings,
      ]),
    })
    .optional(),
  resultId: z.string().optional(),
  dynamicTheme: dynamicThemeSchema.optional(),
  logs: z.array(chatLogSchema).optional(),
  lastMessageNewFormat: z
    .string()
    .optional()
    .describe(
      'The sent message is validated and formatted on the backend. This is set only if the message differs from the formatted version.'
    ),
})
