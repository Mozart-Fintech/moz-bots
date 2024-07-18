import { PrismaClient } from '@mozbot.io/prisma'
import * as p from '@clack/prompts'
import { promptAndSetEnvironment } from './utils'
import cliProgress from 'cli-progress'
import { writeFileSync } from 'fs'
import {
  ResultWithAnswers,
  MozbotV6,
  resultWithAnswersSchema,
} from '@mozbot.io/schemas'
import { byId } from '@mozbot.io/lib'
import { parseResultHeader } from '@mozbot.io/results/parseResultHeader'
import { convertResultsToTableData } from '@mozbot.io/results/convertResultsToTableData'
import { parseBlockIdVariableIdMap } from '@mozbot.io/results/parseBlockIdVariableIdMap'
import { parseColumnsOrder } from '@mozbot.io/results/parseColumnsOrder'
import { parseUniqueKey } from '@mozbot.io/lib/parseUniqueKey'
import { unparse } from 'papaparse'
import { z } from 'zod'

const exportResults = async () => {
  await promptAndSetEnvironment('production')

  const prisma = new PrismaClient()

  const mozbotId = (await p.text({
    message: 'Mozbot ID?',
  })) as string

  if (!mozbotId || typeof mozbotId !== 'string') {
    console.log('No id provided')
    return
  }

  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  )

  const mozbot = (await prisma.mozbot.findUnique({
    where: {
      id: mozbotId,
    },
  })) as MozbotV6 | null

  if (!mozbot) {
    console.log('No mozbot found')
    return
  }

  const totalResultsToExport = await prisma.result.count({
    where: {
      mozbotId,
      hasStarted: true,
      isArchived: false,
    },
  })

  progressBar.start(totalResultsToExport, 0)

  const results: ResultWithAnswers[] = []

  for (let skip = 0; skip < totalResultsToExport; skip += 50) {
    results.push(
      ...z.array(resultWithAnswersSchema).parse(
        (
          await prisma.result.findMany({
            take: 50,
            skip,
            where: {
              mozbotId,
              hasStarted: true,
              isArchived: false,
            },
            orderBy: {
              createdAt: 'desc',
            },
            include: {
              answers: {
                select: {
                  content: true,
                  blockId: true,
                },
              },
              answersV2: {
                select: {
                  content: true,
                  blockId: true,
                },
              },
            },
          })
        ).map((r) => ({ ...r, answers: r.answersV2.concat(r.answers) }))
      )
    )
    progressBar.increment(50)
  }

  progressBar.stop()

  writeFileSync('logs/results.json', JSON.stringify(results))

  const resultHeader = parseResultHeader(mozbot, [])

  const dataToUnparse = convertResultsToTableData({
    results,
    headerCells: resultHeader,
    blockIdVariableIdMap: parseBlockIdVariableIdMap(mozbot?.groups),
  })

  const headerIds = parseColumnsOrder(
    mozbot?.resultsTablePreferences?.columnsOrder,
    resultHeader
  ).reduce<string[]>((currentHeaderIds, columnId) => {
    if (mozbot?.resultsTablePreferences?.columnsVisibility[columnId] === false)
      return currentHeaderIds
    const columnLabel = resultHeader.find(
      (headerCell) => headerCell.id === columnId
    )?.id
    if (!columnLabel) return currentHeaderIds
    return [...currentHeaderIds, columnLabel]
  }, [])

  const data = dataToUnparse.map<{ [key: string]: string }>((data) => {
    const newObject: { [key: string]: string } = {}
    headerIds?.forEach((headerId) => {
      const headerLabel = resultHeader.find(byId(headerId))?.label
      if (!headerLabel) return
      const newKey = parseUniqueKey(headerLabel, Object.keys(newObject))
      newObject[newKey] = data[headerId]?.plainText
    })
    return newObject
  })

  const csv = unparse(data)

  writeFileSync('logs/results.csv', csv)
}

exportResults()
