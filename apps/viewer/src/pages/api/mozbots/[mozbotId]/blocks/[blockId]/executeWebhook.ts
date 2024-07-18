/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ResultValues,
  Mozbot,
  Variable,
  HttpRequest,
  Block,
  PublicMozbot,
  AnswerInSessionState,
} from '@mozbot.io/schemas'
import { NextApiRequest, NextApiResponse } from 'next'
import { byId } from '@mozbot.io/lib'
import { isWebhookBlock } from '@mozbot.io/schemas/helpers'
import { initMiddleware, methodNotAllowed, notFound } from '@mozbot.io/lib/api'
import Cors from 'cors'
import prisma from '@mozbot.io/lib/prisma'
import { getBlockById } from '@mozbot.io/schemas/helpers'
import {
  executeWebhook,
  parseWebhookAttributes,
} from '@mozbot.io/bot-engine/blocks/integrations/webhook/executeWebhookBlock'
import { fetchLinkedParentMozbots } from '@mozbot.io/bot-engine/blocks/logic/mozbotLink/fetchLinkedParentMozbots'
import { fetchLinkedChildMozbots } from '@mozbot.io/bot-engine/blocks/logic/mozbotLink/fetchLinkedChildMozbots'
import { parseSampleResult } from '@mozbot.io/bot-engine/blocks/integrations/webhook/parseSampleResult'
import { saveLog } from '@mozbot.io/bot-engine/logs/saveLog'
import { authenticateUser } from '@/helpers/authenticateUser'

const cors = initMiddleware(Cors())

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  await cors(req, res)
  if (req.method === 'POST') {
    const user = await authenticateUser(req)
    const mozbotId = req.query.mozbotId as string
    const blockId = req.query.blockId as string
    const resultId = req.query.resultId as string | undefined
    const { resultValues, variables, parentmozbotIds } = (
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    ) as {
      resultValues: ResultValues
      variables: Variable[]
      parentmozbotIds: string[]
    }
    const mozbot = (await prisma.mozbot.findUnique({
      where: { id: mozbotId },
      include: { webhooks: true },
    })) as unknown as (Mozbot & { webhooks: HttpRequest[] }) | null
    if (!mozbot) return notFound(res)
    const block = mozbot.groups
      .flatMap<Block>((g) => g.blocks)
      .find(byId(blockId))
    if (!block || !isWebhookBlock(block))
      return notFound(res, 'Webhook block not found')
    const webhookId = 'webhookId' in block ? block.webhookId : undefined
    const webhook =
      block.options?.webhook ??
      mozbot.webhooks.find((w) => {
        if ('id' in w) return w.id === webhookId
        return false
      })
    if (!webhook)
      return res
        .status(404)
        .send({ statusCode: 404, data: { message: `Couldn't find webhook` } })
    const { group } = getBlockById(blockId, mozbot.groups)
    const linkedMozbotsParents = (await fetchLinkedParentMozbots({
      isPreview: !('mozbotId' in mozbot),
      parentmozbotIds,
      userId: user?.id,
    })) as (Mozbot | PublicMozbot)[]
    const linkedMozbotsChildren = await fetchLinkedChildMozbots({
      isPreview: !('mozbotId' in mozbot),
      mozbots: [mozbot],
      userId: user?.id,
    })([])

    const linkedMozbots = [...linkedMozbotsParents, ...linkedMozbotsChildren]

    const answers = resultValues
      ? resultValues.answers.map((answer: any) => ({
          key:
            (answer.variableId
              ? mozbot.variables.find(
                  (variable) => variable.id === answer.variableId
                )?.name
              : mozbot.groups.find((group) =>
                  group.blocks.find((block) => block.id === answer.blockId)
                )?.title) ?? '',
          value: answer.content,
        }))
      : arrayify(
          await parseSampleResult(mozbot, linkedMozbots)(group.id, variables)
        )

    const parsedWebhook = await parseWebhookAttributes({
      webhook,
      isCustomBody: block.options?.isCustomBody,
      mozbot: {
        ...mozbot,
        variables: mozbot.variables.map((v) => {
          const matchingVariable = variables.find(byId(v.id))
          if (!matchingVariable) return v
          return { ...v, value: matchingVariable.value }
        }),
      },
      answers,
    })

    if (!parsedWebhook)
      return res.status(500).send({
        statusCode: 500,
        data: { message: `Couldn't parse webhook attributes` },
      })

    const { response, logs } = await executeWebhook(parsedWebhook, {
      timeout: block.options?.timeout,
    })

    if (resultId)
      await Promise.all(
        logs?.map((log) =>
          saveLog({
            message: log.description,
            details: log.details,
            status: log.status as 'error' | 'success' | 'info',
            resultId,
          })
        ) ?? []
      )

    return res.status(200).send(response)
  }
  return methodNotAllowed(res)
}

const arrayify = (
  obj: Record<string, string | boolean | undefined>
): AnswerInSessionState[] =>
  Object.entries(obj)
    .map(([key, value]) => ({ key, value: value?.toString() }))
    .filter((a) => a.value) as AnswerInSessionState[]

export default handler
