import { createId } from '@paralleldrive/cuid2'
import { TRPCError } from '@trpc/server'
import { isDefined, omit, isNotEmpty } from '@mozbot.io/lib'
import { isInputBlock } from '@mozbot.io/schemas/helpers'
import {
  Variable,
  VariableWithValue,
  Theme,
  GoogleAnalyticsBlock,
  PixelBlock,
  SessionState,
  MozbotInSession,
  Block,
  SetVariableHistoryItem,
} from '@mozbot.io/schemas'
import {
  StartChatInput,
  StartChatResponse,
  StartPreviewChatInput,
  StartMozbot,
  startMozbotSchema,
} from '@mozbot.io/schemas/features/chat/schema'
import parse, { NodeType } from 'node-html-parser'
import { parseDynamicTheme } from './parseDynamicTheme'
import { findMozbot } from './queries/findMozbot'
import { findPublicMozbot } from './queries/findPublicMozbot'
import { findResult } from './queries/findResult'
import { startBotFlow } from './startBotFlow'
import { prefillVariables } from '@mozbot.io/variables/prefillVariables'
import { deepParseVariables } from '@mozbot.io/variables/deepParseVariables'
import { injectVariablesFromExistingResult } from '@mozbot.io/variables/injectVariablesFromExistingResult'
import { getNextGroup } from './getNextGroup'
import { upsertResult } from './queries/upsertResult'
import { continueBotFlow } from './continueBotFlow'
import {
  getVariablesToParseInfoInText,
  parseVariables,
} from '@mozbot.io/variables/parseVariables'
import { defaultSettings } from '@mozbot.io/schemas/features/mozbot/settings/constants'
import { IntegrationBlockType } from '@mozbot.io/schemas/features/blocks/integrations/constants'
import { VisitedEdge } from '@mozbot.io/prisma'
import { env } from '@mozbot.io/env'
import { getFirstEdgeId } from './getFirstEdgeId'
import { Reply } from './types'
import {
  defaultGuestAvatarIsEnabled,
  defaultHostAvatarIsEnabled,
} from '@mozbot.io/schemas/features/mozbot/theme/constants'
import { BubbleBlockType } from '@mozbot.io/schemas/features/blocks/bubbles/constants'
import { LogicBlockType } from '@mozbot.io/schemas/features/blocks/logic/constants'
import { parseVariablesInRichText } from './parseBubbleBlock'

type StartParams =
  | ({
      type: 'preview'
      userId?: string
    } & StartPreviewChatInput)
  | ({
      type: 'live'
    } & StartChatInput)

type Props = {
  version: 1 | 2
  startParams: StartParams
  initialSessionState?: Pick<SessionState, 'whatsApp' | 'expiryTimeout'>
}

export const startSession = async ({
  version,
  startParams,
  initialSessionState,
}: Props): Promise<
  Omit<StartChatResponse, 'resultId' | 'isStreamEnabled' | 'sessionId'> & {
    newSessionState: SessionState
    visitedEdges: VisitedEdge[]
    setVariableHistory: SetVariableHistoryItem[]
    resultId?: string
  }
> => {
  const mozbot = await getMozbot(startParams)

  const prefilledVariables = startParams.prefilledVariables
    ? prefillVariables(mozbot.variables, startParams.prefilledVariables)
    : mozbot.variables

  const result = await getResult({
    resultId: startParams.type === 'live' ? startParams.resultId : undefined,
    isPreview: startParams.type === 'preview',
    mozbotId: mozbot.id,
    prefilledVariables,
    isRememberUserEnabled:
      mozbot.settings.general?.rememberUser?.isEnabled ??
      (isDefined(mozbot.settings.general?.isNewResultOnRefreshEnabled)
        ? !mozbot.settings.general?.isNewResultOnRefreshEnabled
        : defaultSettings.general.rememberUser.isEnabled),
  })

  const startVariables =
    result && result.variables.length > 0
      ? injectVariablesFromExistingResult(prefilledVariables, result.variables)
      : prefilledVariables

  const mozbotInSession = convertStartMozbotToMozbotInSession(
    mozbot,
    startVariables
  )

  const initialState: SessionState = {
    version: '3',
    mozbotsQueue: [
      {
        resultId: result?.id,
        mozbot: mozbotInSession,
        answers: result
          ? result.answers.map((answer) => {
              const block = mozbot.groups
                .flatMap<Block>((group) => group.blocks)
                .find((block) => block.id === answer.blockId)
              if (!block || !isInputBlock(block))
                return {
                  key: 'unknown',
                  value: answer.content,
                }
              const key =
                (block.options?.variableId
                  ? startVariables.find(
                      (variable) => variable.id === block.options?.variableId
                    )?.name
                  : mozbot.groups.find((group) =>
                      group.blocks.find(
                        (blockInGroup) => blockInGroup.id === block.id
                      )
                    )?.title) ?? 'unknown'
              return {
                key,
                value: answer.content,
              }
            })
          : [],
      },
    ],
    dynamicTheme: parseDynamicThemeInState(mozbot.theme),
    isStreamEnabled: startParams.isStreamEnabled,
    typingEmulation: mozbot.settings.typingEmulation,
    allowedOrigins:
      startParams.type === 'preview'
        ? undefined
        : mozbot.settings.security?.allowedOrigins,
    progressMetadata: initialSessionState?.whatsApp
      ? undefined
      : mozbot.theme.general?.progressBar?.isEnabled
      ? { totalAnswers: 0 }
      : undefined,
    setVariableIdsForHistory:
      extractVariableIdsUsedForTranscript(mozbotInSession),
    ...initialSessionState,
  }

  if (startParams.isOnlyRegistering) {
    return {
      newSessionState: initialState,
      mozbot: {
        id: mozbot.id,
        settings: deepParseVariables(
          initialState.mozbotsQueue[0].mozbot.variables
        )(mozbot.settings),
        theme: sanitizeAndParseTheme(mozbot.theme, {
          variables: initialState.mozbotsQueue[0].mozbot.variables,
        }),
      },
      dynamicTheme: parseDynamicTheme(initialState),
      messages: [],
      visitedEdges: [],
      setVariableHistory: [],
    }
  }

  let chatReply = await startBotFlow({
    version,
    state: initialState,
    startFrom:
      startParams.type === 'preview' ? startParams.startFrom : undefined,
    startTime: Date.now(),
    textBubbleContentFormat: startParams.textBubbleContentFormat,
  })

  // If params has message and first block is an input block, we can directly continue the bot flow
  if (startParams.message) {
    const firstEdgeId = getFirstEdgeId({
      mozbot: chatReply.newSessionState.mozbotsQueue[0].mozbot,
      startEventId:
        startParams.type === 'preview' &&
        startParams.startFrom?.type === 'event'
          ? startParams.startFrom.eventId
          : undefined,
    })
    const nextGroup = await getNextGroup({
      state: chatReply.newSessionState,
      edgeId: firstEdgeId,
      isOffDefaultPath: false,
    })
    const newSessionState = nextGroup.newSessionState
    const firstBlock = nextGroup.group?.blocks.at(0)
    if (firstBlock && isInputBlock(firstBlock)) {
      const resultId = newSessionState.mozbotsQueue[0].resultId
      if (resultId)
        await upsertResult({
          hasStarted: true,
          isCompleted: false,
          resultId,
          mozbot: newSessionState.mozbotsQueue[0].mozbot,
        })
      chatReply = await continueBotFlow(startParams.message, {
        version,
        state: {
          ...newSessionState,
          currentBlockId: firstBlock.id,
        },
        textBubbleContentFormat: startParams.textBubbleContentFormat,
      })
    }
  }

  const {
    messages,
    input,
    clientSideActions: startFlowClientActions,
    newSessionState,
    logs,
    visitedEdges,
    setVariableHistory,
  } = chatReply

  const clientSideActions = startFlowClientActions ?? []

  const startClientSideAction = parseStartClientSideAction(mozbot)

  const startLogs = logs ?? []

  if (isDefined(startClientSideAction)) {
    if (!result) {
      if ('startPropsToInject' in startClientSideAction) {
        const { customHeadCode, googleAnalyticsId, pixelIds, gtmId } =
          startClientSideAction.startPropsToInject
        let toolsList = ''
        if (customHeadCode) toolsList += 'Custom head code, '
        if (googleAnalyticsId) toolsList += 'Google Analytics, '
        if (pixelIds) toolsList += 'Pixel, '
        if (gtmId) toolsList += 'Google Tag Manager, '
        toolsList = toolsList.slice(0, -2)
        startLogs.push({
          description: `${toolsList} ${
            toolsList.includes(',') ? 'are not' : 'is not'
          } enabled in Preview mode`,
          status: 'info',
        })
      }
    } else {
      clientSideActions.unshift(startClientSideAction)
    }
  }

  const clientSideActionsNeedSessionId = clientSideActions?.some(
    (action) => action.expectsDedicatedReply
  )

  if (!input && !clientSideActionsNeedSessionId)
    return {
      newSessionState,
      messages,
      clientSideActions:
        clientSideActions.length > 0 ? clientSideActions : undefined,
      mozbot: {
        id: mozbot.id,
        settings: deepParseVariables(
          newSessionState.mozbotsQueue[0].mozbot.variables
        )(mozbot.settings),
        theme: sanitizeAndParseTheme(mozbot.theme, {
          variables: initialState.mozbotsQueue[0].mozbot.variables,
        }),
      },
      dynamicTheme: parseDynamicTheme(newSessionState),
      logs: startLogs.length > 0 ? startLogs : undefined,
      visitedEdges,
      setVariableHistory,
    }

  return {
    newSessionState,
    resultId: result?.id,
    mozbot: {
      id: mozbot.id,
      settings: deepParseVariables(
        newSessionState.mozbotsQueue[0].mozbot.variables
      )(mozbot.settings),
      theme: sanitizeAndParseTheme(mozbot.theme, {
        variables: initialState.mozbotsQueue[0].mozbot.variables,
      }),
    },
    messages,
    input,
    clientSideActions:
      clientSideActions.length > 0 ? clientSideActions : undefined,
    dynamicTheme: parseDynamicTheme(newSessionState),
    logs: startLogs.length > 0 ? startLogs : undefined,
    visitedEdges,
    setVariableHistory,
  }
}

const getMozbot = async (startParams: StartParams): Promise<StartMozbot> => {
  if (startParams.type === 'preview' && startParams.mozbot)
    return startParams.mozbot

  if (
    startParams.type === 'preview' &&
    !startParams.userId &&
    !env.NEXT_PUBLIC_E2E_TEST
  )
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You need to be authenticated to perform this action',
    })

  const mozbotQuery =
    startParams.type === 'preview'
      ? await findMozbot({
          id: startParams.mozbotId,
          userId: startParams.userId,
        })
      : await findPublicMozbot({ publicId: startParams.publicId })

  const parsedMozbot =
    mozbotQuery && 'mozbot' in mozbotQuery
      ? {
          id: mozbotQuery.mozbotId,
          ...omit(mozbotQuery.mozbot, 'workspace'),
          ...omit(mozbotQuery, 'mozbot', 'mozbotId'),
        }
      : mozbotQuery

  if (!parsedMozbot || parsedMozbot.isArchived)
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Mozbot not found',
    })

  const isQuarantinedOrSuspended =
    mozbotQuery &&
    'mozbot' in mozbotQuery &&
    (mozbotQuery.mozbot.workspace.isQuarantined ||
      mozbotQuery.mozbot.workspace.isSuspended)

  if (
    ('isClosed' in parsedMozbot && parsedMozbot.isClosed) ||
    isQuarantinedOrSuspended
  )
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Mozbot is closed',
    })

  return startMozbotSchema.parse(parsedMozbot)
}

const getResult = async ({
  isPreview,
  resultId,
  prefilledVariables,
  isRememberUserEnabled,
}: {
  resultId: string | undefined
  isPreview: boolean
  mozbotId: string
  prefilledVariables: Variable[]
  isRememberUserEnabled: boolean
}) => {
  if (isPreview) return
  const existingResult =
    resultId && isRememberUserEnabled
      ? await findResult({ id: resultId })
      : undefined

  const prefilledVariableWithValue = prefilledVariables.filter(
    (prefilledVariable) => isDefined(prefilledVariable.value)
  )

  const updatedResult = {
    variables: prefilledVariableWithValue.concat(
      existingResult?.variables.filter(
        (resultVariable) =>
          isDefined(resultVariable.value) &&
          !prefilledVariableWithValue.some(
            (prefilledVariable) =>
              prefilledVariable.name === resultVariable.name
          )
      ) ?? []
    ) as VariableWithValue[],
  }
  return {
    id: existingResult?.id ?? createId(),
    variables: updatedResult.variables,
    answers: existingResult?.answers ?? [],
  }
}

const parseDynamicThemeInState = (theme: Theme) => {
  const hostAvatarUrl =
    theme.chat?.hostAvatar?.isEnabled ?? defaultHostAvatarIsEnabled
      ? theme.chat?.hostAvatar?.url
      : undefined
  const guestAvatarUrl =
    theme.chat?.guestAvatar?.isEnabled ?? defaultGuestAvatarIsEnabled
      ? theme.chat?.guestAvatar?.url
      : undefined
  if (!hostAvatarUrl?.startsWith('{{') && !guestAvatarUrl?.startsWith('{{'))
    return
  return {
    hostAvatarUrl: hostAvatarUrl?.startsWith('{{') ? hostAvatarUrl : undefined,
    guestAvatarUrl: guestAvatarUrl?.startsWith('{{')
      ? guestAvatarUrl
      : undefined,
  }
}

const parseStartClientSideAction = (
  mozbot: StartMozbot
): NonNullable<StartChatResponse['clientSideActions']>[number] | undefined => {
  const blocks = mozbot.groups.flatMap<Block>((group) => group.blocks)
  const pixelBlocks = (
    blocks.filter(
      (block) =>
        block.type === IntegrationBlockType.PIXEL &&
        isNotEmpty(block.options?.pixelId) &&
        block.options?.isInitSkip !== true
    ) as PixelBlock[]
  ).map((pixelBlock) => pixelBlock.options?.pixelId as string)

  const startPropsToInject = {
    customHeadCode: isNotEmpty(mozbot.settings.metadata?.customHeadCode)
      ? sanitizeAndParseHeadCode(
          mozbot.settings.metadata?.customHeadCode as string
        )
      : undefined,
    gtmId: mozbot.settings.metadata?.googleTagManagerId,
    googleAnalyticsId: (
      blocks.find(
        (block) =>
          block.type === IntegrationBlockType.GOOGLE_ANALYTICS &&
          block.options?.trackingId
      ) as GoogleAnalyticsBlock | undefined
    )?.options?.trackingId,
    pixelIds: pixelBlocks.length > 0 ? pixelBlocks : undefined,
  }

  if (
    !startPropsToInject.customHeadCode &&
    !startPropsToInject.gtmId &&
    !startPropsToInject.googleAnalyticsId &&
    !startPropsToInject.pixelIds
  )
    return

  return { type: 'startPropsToInject', startPropsToInject }
}

const sanitizeAndParseTheme = (
  theme: Theme,
  { variables }: { variables: Variable[] }
): Theme => ({
  general: theme.general
    ? deepParseVariables(variables)(theme.general)
    : undefined,
  chat: theme.chat ? deepParseVariables(variables)(theme.chat) : undefined,
  customCss: theme.customCss
    ? removeLiteBadgeCss(parseVariables(variables)(theme.customCss))
    : undefined,
})

const sanitizeAndParseHeadCode = (code: string) => {
  code = removeLiteBadgeCss(code)
  return parse(code)
    .childNodes.filter((child) => child.nodeType !== NodeType.TEXT_NODE)
    .join('\n')
}

const removeLiteBadgeCss = (code: string) => {
  const liteBadgeCssRegex = /.*#lite-badge.*{[\s\S][^{]*}/gm
  return code.replace(liteBadgeCssRegex, '')
}

const convertStartMozbotToMozbotInSession = (
  mozbot: StartMozbot,
  startVariables: Variable[]
): MozbotInSession =>
  mozbot.version === '6'
    ? {
        version: mozbot.version,
        id: mozbot.id,
        groups: mozbot.groups,
        edges: mozbot.edges,
        variables: startVariables,
        events: mozbot.events,
      }
    : {
        version: mozbot.version,
        id: mozbot.id,
        groups: mozbot.groups,
        edges: mozbot.edges,
        variables: startVariables,
        events: mozbot.events,
      }

const extractVariableIdsUsedForTranscript = (
  mozbot: MozbotInSession
): string[] => {
  const variableIds: Set<string> = new Set()
  const parseVarParams = {
    variables: mozbot.variables,
    takeLatestIfList: mozbot.version !== '6',
  }
  mozbot.groups.forEach((group) => {
    group.blocks.forEach((block) => {
      if (block.type === BubbleBlockType.TEXT) {
        const { parsedVariableIds } = parseVariablesInRichText(
          block.content?.richText ?? [],
          parseVarParams
        )
        parsedVariableIds.forEach((variableId) => variableIds.add(variableId))
      }
      if (
        block.type === BubbleBlockType.IMAGE ||
        block.type === BubbleBlockType.VIDEO ||
        block.type === BubbleBlockType.AUDIO
      ) {
        if (!block.content?.url) return
        const variablesInfo = getVariablesToParseInfoInText(
          block.content.url,
          parseVarParams
        )
        variablesInfo.forEach((variableInfo) =>
          variableInfo.variableId
            ? variableIds.add(variableInfo.variableId ?? '')
            : undefined
        )
      }
      if (block.type === LogicBlockType.CONDITION) {
        block.items.forEach((item) =>
          item.content?.comparisons?.forEach((comparison) => {
            if (comparison.variableId) variableIds.add(comparison.variableId)
            if (comparison.value) {
              const variableIdsInValue = getVariablesToParseInfoInText(
                comparison.value,
                parseVarParams
              )
              variableIdsInValue.forEach((variableInfo) => {
                variableInfo.variableId
                  ? variableIds.add(variableInfo.variableId)
                  : undefined
              })
            }
          })
        )
      }
    })
  })
  return [...variableIds]
}
