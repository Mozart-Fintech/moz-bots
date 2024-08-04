import prisma from '@mozbot.io/lib/prisma'
import {
  ContinueChatResponse,
  PublicMozbot,
  SessionState,
  SetVariableHistoryItem,
  Settings,
  Mozbot,
} from '@mozbot.io/schemas'
import {
  WhatsAppCredentials,
  defaultSessionExpiryTimeout,
} from '@mozbot.io/schemas/features/whatsapp'
import { isNotDefined } from '@mozbot.io/lib/utils'
import { startSession } from '../startSession'
import {
  LogicalOperator,
  ComparisonOperators,
} from '@mozbot.io/schemas/features/blocks/logic/condition/constants'
import { VisitedEdge } from '@mozbot.io/prisma'
import { Reply } from '../types'

type Props = {
  incomingMessage?: Reply
  workspaceId: string
  credentials: WhatsAppCredentials['data'] & Pick<WhatsAppCredentials, 'id'>
  contact: NonNullable<SessionState['whatsApp']>['contact']
}

export const startWhatsAppSession = async ({
  incomingMessage,
  workspaceId,
  credentials,
  contact,
}: Props): Promise<
  | (ContinueChatResponse & {
      newSessionState: SessionState
      visitedEdges: VisitedEdge[]
      setVariableHistory: SetVariableHistoryItem[]
    })
  | { error: string }
> => {
  const publicMozbotsWithWhatsAppEnabled = (await prisma.publicMozbot.findMany({
    where: {
      mozbot: { workspaceId, whatsAppCredentialsId: credentials.id },
    },
    select: {
      settings: true,
      mozbot: {
        select: {
          publicId: true,
        },
      },
    },
  })) as (Pick<PublicMozbot, 'settings'> & {
    mozbot: Pick<Mozbot, 'publicId'>
  })[]

  const botsWithWhatsAppEnabled = publicMozbotsWithWhatsAppEnabled.filter(
    (publicMozbot) =>
      publicMozbot.mozbot.publicId && publicMozbot.settings.whatsApp?.isEnabled
  )

  const publicMozbotWithMatchedCondition = botsWithWhatsAppEnabled.find(
    (publicMozbot) =>
      (publicMozbot.settings.whatsApp?.startCondition?.comparisons.length ??
        0) > 0 &&
      messageMatchStartCondition(
        incomingMessage ?? { type: 'text', text: '' },
        publicMozbot.settings.whatsApp?.startCondition
      )
  )

  const publicMozbot =
    publicMozbotWithMatchedCondition ??
    botsWithWhatsAppEnabled.find(
      (publicMozbot) => !publicMozbot.settings.whatsApp?.startCondition
    )

  if (isNotDefined(publicMozbot))
    return botsWithWhatsAppEnabled.length > 0
      ? { error: 'Message did not matched any condition' }
      : { error: 'No public mozbot with WhatsApp integration found' }

  const sessionExpiryTimeoutHours =
    publicMozbot.settings.whatsApp?.sessionExpiryTimeout ??
    defaultSessionExpiryTimeout

  return startSession({
    version: 2,
    startParams: {
      type: 'live',
      publicId: publicMozbot.mozbot.publicId as string,
      isOnlyRegistering: false,
      isStreamEnabled: false,
      textBubbleContentFormat: 'richText',
      message: incomingMessage,
    },
    initialSessionState: {
      whatsApp: {
        contact,
      },
      expiryTimeout: sessionExpiryTimeoutHours * 60 * 60 * 1000,
    },
  })
}

export const messageMatchStartCondition = (
  message: Reply,
  startCondition: NonNullable<Settings['whatsApp']>['startCondition']
) => {
  if (!startCondition) return true
  if (!message?.text) return false
  return startCondition.logicalOperator === LogicalOperator.AND
    ? startCondition.comparisons.every((comparison) =>
        matchComparison(
          message.text,
          comparison.comparisonOperator,
          comparison.value
        )
      )
    : startCondition.comparisons.some((comparison) =>
        matchComparison(
          message.text,
          comparison.comparisonOperator,
          comparison.value
        )
      )
}

const matchComparison = (
  inputValue: string,
  comparisonOperator?: ComparisonOperators,
  value?: string
): boolean | undefined => {
  if (!comparisonOperator) return false
  switch (comparisonOperator) {
    case ComparisonOperators.CONTAINS: {
      if (!value) return false
      return inputValue
        .trim()
        .toLowerCase()
        .includes(value.trim().toLowerCase())
    }
    case ComparisonOperators.EQUAL: {
      return inputValue === value
    }
    case ComparisonOperators.NOT_EQUAL: {
      return inputValue !== value
    }
    case ComparisonOperators.GREATER: {
      if (!value) return false
      return parseFloat(inputValue) > parseFloat(value)
    }
    case ComparisonOperators.LESS: {
      if (!value) return false
      return parseFloat(inputValue) < parseFloat(value)
    }
    case ComparisonOperators.IS_SET: {
      return inputValue.length > 0
    }
    case ComparisonOperators.IS_EMPTY: {
      return inputValue.length === 0
    }
    case ComparisonOperators.STARTS_WITH: {
      if (!value) return false
      return inputValue.toLowerCase().startsWith(value.toLowerCase())
    }
    case ComparisonOperators.ENDS_WITH: {
      if (!value) return false
      return inputValue.toLowerCase().endsWith(value.toLowerCase())
    }
    case ComparisonOperators.NOT_CONTAINS: {
      if (!value) return false
      return !inputValue
        .trim()
        .toLowerCase()
        .includes(value.trim().toLowerCase())
    }
  }
}
