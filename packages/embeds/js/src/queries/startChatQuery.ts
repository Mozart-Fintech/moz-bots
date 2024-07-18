import { BotContext } from '@/types'
import { guessApiHost } from '@/utils/guessApiHost'
import { isNotDefined, isNotEmpty } from '@mozbot.io/lib'
import {
  getPaymentInProgressInStorage,
  removePaymentInProgressFromStorage,
} from '@/features/blocks/inputs/payment/helpers/paymentInProgressStorage'
import {
  ContinueChatResponse,
  StartChatInput,
  StartChatResponse,
  StartFrom,
  StartPreviewChatInput,
} from '@mozbot.io/schemas'
import ky from 'ky'
import { CorsError } from '@/utils/CorsError'

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mozbot: string | any
  stripeRedirectStatus?: string
  apiHost?: string
  startFrom?: StartFrom
  isPreview: boolean
  prefilledVariables?: Record<string, unknown>
  resultId?: string
  sessionId?: string
}

export async function startChatQuery({
  mozbot,
  isPreview,
  apiHost,
  prefilledVariables,
  resultId,
  stripeRedirectStatus,
  startFrom,
  sessionId,
}: Props) {
  if (isNotDefined(mozbot))
    throw new Error('Mozbot ID is required to get initial messages')

  const paymentInProgressStateStr = getPaymentInProgressInStorage() ?? undefined
  const paymentInProgressState = paymentInProgressStateStr
    ? (JSON.parse(paymentInProgressStateStr) as {
        sessionId: string
        mozbot: BotContext['mozbot']
      })
    : undefined
  if (paymentInProgressState) {
    removePaymentInProgressFromStorage()

    try {
      const data = await ky
        .post(
          `${isNotEmpty(apiHost) ? apiHost : guessApiHost()}/api/v1/sessions/${
            paymentInProgressState.sessionId
          }/continueChat`,
          {
            json: {
              message: paymentInProgressState
                ? stripeRedirectStatus === 'failed'
                  ? 'fail'
                  : 'Success'
                : undefined,
            },
            timeout: false,
          }
        )
        .json<ContinueChatResponse>()

      return {
        data: {
          ...data,
          ...paymentInProgressState,
        } satisfies StartChatResponse,
      }
    } catch (error) {
      return { error }
    }
  }
  const mozbotId = typeof mozbot === 'string' ? mozbot : mozbot.id
  if (isPreview) {
    try {
      const data = await ky
        .post(
          `${
            isNotEmpty(apiHost) ? apiHost : guessApiHost()
          }/api/v1/mozbots/${mozbotId}/preview/startChat`,
          {
            json: {
              isStreamEnabled: true,
              startFrom,
              mozbot,
              prefilledVariables,
              sessionId,
            } satisfies Omit<
              StartPreviewChatInput,
              'mozbotId' | 'isOnlyRegistering' | 'textBubbleContentFormat'
            >,
            timeout: false,
          }
        )
        .json<StartChatResponse>()

      return { data }
    } catch (error) {
      return { error }
    }
  }

  try {
    const iframeReferrerOrigin =
      parent !== window && isNotEmpty(document.referrer)
        ? new URL(document.referrer).origin
        : undefined
    const response = await ky.post(
      `${
        isNotEmpty(apiHost) ? apiHost : guessApiHost()
      }/api/v1/mozbots/${mozbotId}/startChat`,
      {
        headers: {
          'x-mozbot-iframe-referrer-origin': iframeReferrerOrigin,
        },
        json: {
          isStreamEnabled: true,
          prefilledVariables,
          resultId,
          isOnlyRegistering: false,
        } satisfies Omit<
          StartChatInput,
          'publicId' | 'textBubbleContentFormat'
        >,
        timeout: false,
      }
    )

    const corsAllowOrigin = response.headers.get('access-control-allow-origin')

    if (
      iframeReferrerOrigin &&
      corsAllowOrigin &&
      corsAllowOrigin !== '*' &&
      !iframeReferrerOrigin.includes(corsAllowOrigin)
    )
      throw new CorsError(corsAllowOrigin)

    return { data: await response.json<StartChatResponse>() }
  } catch (error) {
    return { error }
  }
}
