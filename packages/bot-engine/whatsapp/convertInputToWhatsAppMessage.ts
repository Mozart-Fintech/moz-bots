import { ButtonItem, ContinueChatResponse } from '@mozbot.io/schemas'
import { WhatsAppSendingMessage } from '@mozbot.io/schemas/features/whatsapp'
import { isDefined, isEmpty } from '@mozbot.io/lib/utils'
import { BubbleBlockType } from '@mozbot.io/schemas/features/blocks/bubbles/constants'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'
import { defaultPictureChoiceOptions } from '@mozbot.io/schemas/features/blocks/inputs/pictureChoice/constants'
import { defaultChoiceInputOptions } from '@mozbot.io/schemas/features/blocks/inputs/choice/constants'
import { convertRichTextToMarkdown } from '@mozbot.io/lib/markdown/convertRichTextToMarkdown'
import { env } from '@mozbot.io/env'

export const convertInputToWhatsAppMessages = (
  input: NonNullable<ContinueChatResponse['input']>,
  lastMessage: ContinueChatResponse['messages'][number] | undefined
): WhatsAppSendingMessage[] => {
  const lastMessageText =
    lastMessage?.type === BubbleBlockType.TEXT &&
    lastMessage.content.type === 'richText'
      ? convertRichTextToMarkdown(lastMessage.content.richText ?? [], {
          flavour: 'whatsapp',
        })
      : undefined
  switch (input.type) {
    case InputBlockType.DATE:
    case InputBlockType.EMAIL:
    case InputBlockType.FILE:
    case InputBlockType.NUMBER:
    case InputBlockType.PHONE:
    case InputBlockType.URL:
    case InputBlockType.PAYMENT:
    case InputBlockType.RATING:
    case InputBlockType.TEXT:
      return []
    case InputBlockType.PICTURE_CHOICE: {
      if (
        input.options?.isMultipleChoice ??
        defaultPictureChoiceOptions.isMultipleChoice
      )
        return input.items.flatMap((item, idx) => {
          let bodyText = ''
          if (item.title) bodyText += `*${item.title}*`
          if (item.description) {
            if (item.title) bodyText += '\n\n'
            bodyText += item.description
          }
          const imageMessage = item.pictureSrc
            ? ({
                type: 'image',
                image: {
                  link: item.pictureSrc ?? '',
                },
              } as const)
            : undefined
          const textMessage = {
            type: 'text',
            text: {
              body: `${idx + 1}. ${bodyText}`,
            },
          } as const
          return imageMessage ? [imageMessage, textMessage] : textMessage
        })
      return input.items.map((item) => {
        let bodyText = ''
        if (item.title) bodyText += `*${item.title}*`
        if (item.description) {
          if (item.title) bodyText += '\n\n'
          bodyText += item.description
        }
        return {
          type: 'interactive',
          interactive: {
            type: 'button',
            header: item.pictureSrc
              ? {
                  type: 'image',
                  image: {
                    link: item.pictureSrc,
                  },
                }
              : undefined,
            body: isEmpty(bodyText) ? undefined : { text: bodyText },
            action: {
              buttons: [
                {
                  type: 'reply',
                  reply: {
                    id: item.id,
                    title: 'Select',
                  },
                },
              ],
            },
          },
        }
      })
    }
    case InputBlockType.CHOICE: {
      if (
        input.options?.isMultipleChoice ??
        defaultChoiceInputOptions.isMultipleChoice
      )
        return [
          {
            type: 'text',
            text: {
              body:
                `${lastMessageText}\n\n` +
                input.items
                  .map((item, idx) => `${idx + 1}. ${item.content}`)
                  .join('\n'),
            },
          },
        ]
      if (input.items.length <= 3) {
        const items = groupArrayByArraySize(
          input.items.filter((item) => isDefined(item.content)),
          env.WHATSAPP_INTERACTIVE_GROUP_SIZE
        ) as ButtonItem[][]
        return items.map((items, idx) => ({
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: idx === 0 ? lastMessageText ?? '...' : '...',
            },
            action: {
              buttons: items.map((item) => ({
                type: 'reply',
                reply: {
                  id: item.id,
                  title: trimTextTo20Chars(item.content as string),
                },
              })),
            },
          },
        }))
      } else {
        const items = groupArrayByArraySize(
          input.items.filter((item) => isDefined(item.content)),
          10
        ) as ButtonItem[][]
        if (input.options?.withFirstChoice && !input.options?.withLastChoice) {
          return items.map((items, idx) => ({
            type: 'interactive',
            interactive: {
              type: 'list',
              body: {
                text: idx === 0 ? lastMessageText ?? '...' : '...',
              },
              action: {
                button: 'Ver opciones',
                sections: [
                  {
                    title: 'Mas opciones',
                    rows: items.slice(0, 1).map((item) => ({
                      id: item.id,
                      title: trimTextTo20Chars(item.content as string),
                      description: item.description
                        ? trimTextTo20Chars(item.description)
                        : undefined,
                    })),
                  },
                  {
                    title: 'Opciones',
                    rows: items.slice(1).map((item) => ({
                      id: item.id,
                      title: trimTextTo20Chars(item.content as string),
                      description: item.description
                        ? trimTextTo20Chars(item.description)
                        : undefined,
                    })),
                  },
                ],
              },
            },
          }))
        }
        if (!input.options?.withFirstChoice && input.options?.withLastChoice) {
          return items.map((items, idx) => ({
            type: 'interactive',
            interactive: {
              type: 'list',
              body: {
                text: idx === 0 ? lastMessageText ?? '...' : '...',
              },
              action: {
                button: 'Ver opciones',
                sections: [
                  {
                    title: 'Opciones',
                    rows: items.slice(0, -1).map((item) => ({
                      id: item.id,
                      title: trimTextTo20Chars(item.content as string),
                      description: item.description
                        ? trimTextTo20Chars(item.description)
                        : undefined,
                    })),
                  },
                  {
                    title: 'Mas opciones',
                    rows: items.slice(-1).map((item) => ({
                      id: item.id,
                      title: trimTextTo20Chars(item.content as string),
                      description: item.description
                        ? trimTextTo20Chars(item.description)
                        : undefined,
                    })),
                  },
                ],
              },
            },
          }))
        }
        if (input.options?.withFirstChoice && input.options?.withLastChoice) {
          return items.map((items, idx) => ({
            type: 'interactive',
            interactive: {
              type: 'list',
              body: {
                text: idx === 0 ? lastMessageText ?? '...' : '...',
              },
              action: {
                button: 'Ver opciones',
                sections: [
                  {
                    title: 'Atrás',
                    rows: items.slice(0, 1).map((item) => ({
                      id: item.id,
                      title: trimTextTo20Chars(item.content as string),
                      description: item.description
                        ? trimTextTo20Chars(item.description)
                        : undefined,
                    })),
                  },
                  {
                    title: 'Opciones',
                    rows: items.slice(1, -1).map((item) => ({
                      id: item.id,
                      title: trimTextTo20Chars(item.content as string),
                      description: item.description
                        ? trimTextTo20Chars(item.description)
                        : undefined,
                    })),
                  },
                  {
                    title: 'Siguiente',
                    rows: items.slice(-1).map((item) => ({
                      id: item.id,
                      title: trimTextTo20Chars(item.content as string),
                      description: item.description
                        ? trimTextTo20Chars(item.description)
                        : undefined,
                    })),
                  },
                ],
              },
            },
          }))
        }
        return items.map((items, idx) => ({
          type: 'interactive',
          interactive: {
            type: 'list',
            body: {
              text: idx === 0 ? lastMessageText ?? '...' : '...',
            },
            action: {
              button: input.options?.listHeader
                ? trimTextTo20Chars(input.options.listHeader as string)
                : 'Ver opciones',
              sections: [
                {
                  rows: items.map((item) => ({
                    id: item.id,
                    title: trimTextTo20Chars(item.content as string),
                    description: item.description
                      ? trimTextTo20Chars(item.description)
                      : undefined,
                  })),
                },
              ],
            },
          },
        }))
      }
    }
  }
}

const trimTextTo20Chars = (text: string): string =>
  text.length > 20 ? `${text.slice(0, 18)}..` : text

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const groupArrayByArraySize = (arr: any[], n: number) =>
  arr.reduce(
    (r, e, i) => (i % n ? r[r.length - 1].push(e) : r.push([e])) && r,
    []
  )
