import { z } from '../../zod'
import {
  buttonsInputSchemas,
  dateInputSchema,
  emailInputSchema,
  fileInputBlockSchemas,
  numberInputSchema,
  paymentInputRuntimeOptionsSchema,
  paymentInputSchema,
  phoneNumberInputBlockSchema,
  pictureChoiceBlockSchemas,
  ratingInputBlockSchema,
  textInputSchema,
  urlInputSchema,
} from '../blocks'
import { logSchema } from '../result'
import { settingsSchema, themeSchema } from '../mozbot'
import {
  imageBubbleContentSchema,
  videoBubbleContentSchema,
  audioBubbleContentSchema,
  embedBubbleContentSchema,
} from '../blocks/bubbles'
import { sessionStateSchema } from './sessionState'
import { dynamicThemeSchema } from './shared'
import { preprocessMozbot } from '../mozbot/helpers/preprocessMozbot'
import { mozbotV5Schema, mozbotV6Schema } from '../mozbot/mozbot'
import { BubbleBlockType } from '../blocks/bubbles/constants'
import { clientSideActionSchema } from './clientSideAction'
import { ChatSession as ChatSessionFromPrisma } from '@mozbot.io/prisma'

export const messageSchema = z.preprocess(
  (val) => (typeof val === 'string' ? { type: 'text', text: val } : val),
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('text'),
      text: z.string(),
      attachedFileUrls: z
        .array(z.string())
        .optional()
        .describe(
          'Solo se puede proporcionar si el bloque de entrada actual es un bloque de entrada de texto que permite archivos adjuntos'
        ),
    }),
  ])
)
export type Message = z.infer<typeof messageSchema>

const chatSessionSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  state: sessionStateSchema,
  isReplying: z
    .boolean()
    .nullable()
    .describe(
      'Se usa en el tiempo de ejecución de WhatsApp para evitar respuestas concurrentes del bot'
    ),
}) satisfies z.ZodType<ChatSessionFromPrisma, z.ZodTypeDef, unknown>
export type ChatSession = z.infer<typeof chatSessionSchema>

const textMessageSchema = z
  .object({
    type: z.literal(BubbleBlockType.TEXT),
    content: z.discriminatedUnion('type', [
      z.object({
        type: z.literal('richText'),
        richText: z.any(),
      }),
      z.object({
        type: z.literal('markdown'),
        markdown: z.string(),
      }),
    ]),
  })
  .openapi({
    title: 'Texto',
    ref: 'textMessage',
  })

const imageMessageSchema = z
  .object({
    type: z.enum([BubbleBlockType.IMAGE]),
    content: imageBubbleContentSchema,
  })
  .openapi({
    title: 'Imagen',
    ref: 'imageMessage',
  })

const videoMessageSchema = z
  .object({
    type: z.enum([BubbleBlockType.VIDEO]),
    content: videoBubbleContentSchema,
  })
  .openapi({
    title: 'Video',
    ref: 'videoMessage',
  })

const audioMessageSchema = z
  .object({
    type: z.enum([BubbleBlockType.AUDIO]),
    content: audioBubbleContentSchema,
  })
  .openapi({
    title: 'Audio',
    ref: 'audioMessage',
  })

const embedMessageSchema = z
  .object({
    type: z.enum([BubbleBlockType.EMBED]),
    content: embedBubbleContentSchema
      .omit({
        height: true,
      })
      .merge(z.object({ height: z.number().optional() })),
  })
  .openapi({
    title: 'Incrustar',
    ref: 'embedMessage',
  })

const displayEmbedBubbleSchema = z.object({
  url: z.string().optional(),
  waitForEventFunction: z
    .object({
      args: z.record(z.string(), z.unknown()),
      content: z.string(),
    })
    .optional(),
  initFunction: z.object({
    args: z.record(z.string(), z.unknown()),
    content: z.string(),
  }),
})
const customEmbedSchema = z
  .object({
    type: z.literal('custom-embed'),
    content: displayEmbedBubbleSchema,
  })
  .openapi({
    title: 'Incrustación personalizada',
    ref: 'customEmbedMessage',
  })
export type CustomEmbedBubble = z.infer<typeof customEmbedSchema>

export const chatMessageSchema = z
  .object({ id: z.string() })
  .and(
    z.discriminatedUnion('type', [
      textMessageSchema,
      imageMessageSchema,
      videoMessageSchema,
      audioMessageSchema,
      embedMessageSchema,
      customEmbedSchema,
    ])
  )
export type ChatMessage = z.infer<typeof chatMessageSchema>

const startMozbotPick = {
  version: true,
  id: true,
  groups: true,
  events: true,
  edges: true,
  variables: true,
  settings: true,
  theme: true,
} as const
export const startMozbotSchema = z.preprocess(
  preprocessMozbot,
  z.discriminatedUnion('version', [
    mozbotV5Schema._def.schema.pick(startMozbotPick).openapi({
      title: 'Mozbot V5',
      ref: 'mozbotV5',
    }),
    mozbotV6Schema.pick(startMozbotPick).openapi({
      title: 'Mozbot V6',
      ref: 'mozbotV6',
    }),
  ])
)
export type StartMozbot = z.infer<typeof startMozbotSchema>

export const chatLogSchema = logSchema
  .pick({
    status: true,
    description: true,
  })
  .merge(z.object({ details: z.unknown().optional() }))
export type ChatLog = z.infer<typeof chatLogSchema>

export const startChatInputSchema = z.object({
  publicId: z
    .string()
    .describe(
      '[¿Dónde encontrar el ID público de mi bot?](../how-to#how-to-find-my-publicid)'
    ),
  message: messageSchema
    .optional()
    .describe(
      'Solo proporciónelo si su flujo comienza con un bloque de entrada y le gustaría proporcionar una respuesta directamente.'
    ),
  isStreamEnabled: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Si está habilitado, se le pedirá que transmita las completaciones de OpenAI en un cliente y envíe la respuesta generada de vuelta a la API.'
    ),
  resultId: z
    .string()
    .optional()
    .describe('Proporciónelo si desea sobrescribir un resultado existente.'),
  isOnlyRegistering: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Si se establece en `true`, solo registrará la sesión y no iniciará el bot. Esto se usa para plataformas de chat de terceros, ya que puede requerir que se registre una sesión antes de enviar el primer mensaje.'
    ),
  prefilledVariables: z
    .record(z.unknown())
    .optional()
    .describe(
      '[Más información sobre variables prellenadas.](../../editor/variables#prefilled-variables)'
    )
    .openapi({
      example: {
        'First name': 'John',
        Email: 'john@gmail.com',
      },
    }),
  textBubbleContentFormat: z.enum(['richText', 'markdown']).default('richText'),
})
export type StartChatInput = z.infer<typeof startChatInputSchema>

export const startFromSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('group'),
    groupId: z.string(),
  }),
  z.object({
    type: z.literal('event'),
    eventId: z.string(),
  }),
])
export type StartFrom = z.infer<typeof startFromSchema>

export const startPreviewChatInputSchema = z.object({
  mozbotId: z
    .string()
    .describe(
      '[¿Dónde encontrar el ID de mi bot?](../how-to#how-to-find-my-mozbotId)'
    ),
  isStreamEnabled: z.boolean().optional().default(false),
  message: messageSchema.optional(),
  isOnlyRegistering: z
    .boolean()
    .optional()
    .describe(
      'Si se establece en `true`, solo registrará la sesión y no iniciará el bot. Esto se usa para plataformas de chat de terceros, ya que puede requerir que se registre una sesión antes de enviar el primer mensaje.'
    )
    .default(false),
  mozbot: startMozbotSchema
    .optional()
    .describe(
      'Si se establece, sobrescribirá el mozbot que se usa para iniciar el chat.'
    ),
  startFrom: startFromSchema.optional(),
  prefilledVariables: z
    .record(z.unknown())
    .optional()
    .describe(
      '[Más información sobre variables prellenadas.](../../editor/variables#prefilled-variables)'
    )
    .openapi({
      example: {
        'First name': 'John',
        Email: 'john@gmail.com',
      },
    }),
  sessionId: z
    .string()
    .optional()
    .describe(
      'Si se proporciona, se usará como el ID de la sesión y sobrescribirá cualquier sesión existente con el mismo ID.'
    ),
  textBubbleContentFormat: z.enum(['richText', 'markdown']).default('richText'),
})
export type StartPreviewChatInput = z.infer<typeof startPreviewChatInputSchema>

export const runtimeOptionsSchema = paymentInputRuntimeOptionsSchema.optional()
export type RuntimeOptions = z.infer<typeof runtimeOptionsSchema>

const mozbotInChatReplyPick = {
  version: true,
  id: true,
  groups: true,
  edges: true,
  variables: true,
  settings: true,
  theme: true,
} as const
export const mozbotInChatReply = z.preprocess(
  preprocessMozbot,
  z.discriminatedUnion('version', [
    mozbotV5Schema._def.schema.pick(mozbotInChatReplyPick),
    mozbotV6Schema.pick(mozbotInChatReplyPick),
  ])
)

const chatResponseBaseSchema = z.object({
  lastMessageNewFormat: z
    .string()
    .optional()
    .describe(
      'El mensaje enviado es validado y formateado en el backend. Por ejemplo, si para una entrada de fecha respondiste algo como `tomorrow`, el backend lo convertirá a una cadena de fecha. Este campo devuelve el mensaje formateado.'
    ),
  messages: z.array(chatMessageSchema),
  input: z
    .union([
      z.discriminatedUnion('type', [
        textInputSchema,
        buttonsInputSchemas.v6,
        emailInputSchema,
        numberInputSchema,
        urlInputSchema,
        phoneNumberInputBlockSchema,
        dateInputSchema,
        paymentInputSchema,
        ratingInputBlockSchema,
        fileInputBlockSchemas.v6,
        pictureChoiceBlockSchemas.v6,
      ]),
      z.discriminatedUnion('type', [
        buttonsInputSchemas.v5,
        fileInputBlockSchemas.v5,
        pictureChoiceBlockSchemas.v5,
      ]),
    ])
    .and(
      z.object({
        prefilledValue: z.string().optional(),
        runtimeOptions: runtimeOptionsSchema.optional(),
      })
    )
    .optional(),
  clientSideActions: z
    .array(clientSideActionSchema)
    .optional()
    .describe('Acciones a ejecutar en el lado del cliente'),
  logs: z
    .array(chatLogSchema)
    .optional()
    .describe('Registros que se guardaron durante la última ejecución'),
  dynamicTheme: dynamicThemeSchema
    .optional()
    .describe(
      'Si el mozbot contiene avatares dinámicos, dynamicTheme devuelve las nuevas URL de los avatares cada vez que se actualizan sus variables.'
    ),
  progress: z
    .number()
    .optional()
    .describe(
      'Si la barra de progreso está habilitada, este campo devolverá un número entre 0 y 100 que indica el progreso actual basado en el camino más largo restante del flujo.'
    ),
})

export const startChatResponseSchema = z
  .object({
    sessionId: z
      .string()
      .describe('Para guardar y usar en solicitudes /continueChat.'),
    resultId: z.string().optional(),
    mozbot: z.object({
      id: z.string(),
      theme: themeSchema,
      settings: settingsSchema,
    }),
  })
  .merge(chatResponseBaseSchema)
export type StartChatResponse = z.infer<typeof startChatResponseSchema>

export const startPreviewChatResponseSchema = startChatResponseSchema.omit({
  resultId: true,
})

export const continueChatResponseSchema = chatResponseBaseSchema
export type ContinueChatResponse = z.infer<typeof continueChatResponseSchema>
