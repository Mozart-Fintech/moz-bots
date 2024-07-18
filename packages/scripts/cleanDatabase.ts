import { PrismaClient } from '@mozbot.io/prisma'
import { promptAndSetEnvironment } from './utils'
import { archiveResults } from '@mozbot.io/results/archiveResults'
import { Mozbot } from '@mozbot.io/schemas'

const prisma = new PrismaClient()

export const cleanDatabase = async () => {
  await promptAndSetEnvironment('production')

  console.log('Starting database cleanup...')
  await deleteOldChatSessions()
  await deleteExpiredAppSessions()
  await deleteExpiredVerificationTokens()
  const isFirstOfMonth = new Date().getDate() === 1
  if (isFirstOfMonth) {
    await deleteArchivedResults()
    await deleteArchivedMozbots()
    await resetBillingProps()
  }
  console.log('Database cleaned!')
}

const deleteArchivedMozbots = async () => {
  const lastDayTwoMonthsAgo = new Date()
  lastDayTwoMonthsAgo.setMonth(lastDayTwoMonthsAgo.getMonth() - 1)
  lastDayTwoMonthsAgo.setDate(0)

  const mozbots = await prisma.mozbot.findMany({
    where: {
      updatedAt: {
        lte: lastDayTwoMonthsAgo,
      },
      isArchived: true,
    },
    select: { id: true },
  })

  console.log(`Deleting ${mozbots.length} archived mozbots...`)

  const chunkSize = 1000
  for (let i = 0; i < mozbots.length; i += chunkSize) {
    const chunk = mozbots.slice(i, i + chunkSize)
    await deleteResultsFromArchivedMozbotsIfAny(chunk)
    await prisma.mozbot.deleteMany({
      where: {
        id: {
          in: chunk.map((mozbot) => mozbot.id),
        },
      },
    })
  }
  console.log('Done!')
}

const deleteArchivedResults = async () => {
  const lastDayTwoMonthsAgo = new Date()
  lastDayTwoMonthsAgo.setMonth(lastDayTwoMonthsAgo.getMonth() - 1)
  lastDayTwoMonthsAgo.setDate(0)
  let totalResults
  do {
    const results = await prisma.result.findMany({
      where: {
        createdAt: {
          lte: lastDayTwoMonthsAgo,
        },
        isArchived: true,
      },
      select: { id: true },
      take: 80000,
    })
    totalResults = results.length
    console.log(`Deleting ${results.length} archived results...`)
    const chunkSize = 1000
    for (let i = 0; i < results.length; i += chunkSize) {
      const chunk = results.slice(i, i + chunkSize)
      await prisma.result.deleteMany({
        where: {
          id: {
            in: chunk.map((result) => result.id),
          },
        },
      })
    }
  } while (totalResults === 80000)

  console.log('Done!')
}

const deleteOldChatSessions = async () => {
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  let totalChatSessions
  do {
    const chatSessions = await prisma.chatSession.findMany({
      where: {
        updatedAt: {
          lte: twoDaysAgo,
        },
      },
      select: {
        id: true,
      },
      take: 80000,
    })

    totalChatSessions = chatSessions.length

    console.log(`Deleting ${chatSessions.length} old chat sessions...`)
    const chunkSize = 1000
    for (let i = 0; i < chatSessions.length; i += chunkSize) {
      const chunk = chatSessions.slice(i, i + chunkSize)
      await prisma.chatSession.deleteMany({
        where: {
          id: {
            in: chunk.map((chatSession) => chatSession.id),
          },
        },
      })
    }
  } while (totalChatSessions === 80000)
}

const deleteExpiredAppSessions = async () => {
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const { count } = await prisma.session.deleteMany({
    where: {
      expires: {
        lte: threeDaysAgo,
      },
    },
  })
  console.log(`Deleted ${count} expired user sessions.`)
}

const deleteExpiredVerificationTokens = async () => {
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  let totalVerificationTokens
  do {
    const verificationTokens = await prisma.verificationToken.findMany({
      where: {
        expires: {
          lte: threeDaysAgo,
        },
      },
      select: {
        token: true,
      },
      take: 80000,
    })

    totalVerificationTokens = verificationTokens.length

    console.log(`Deleting ${verificationTokens.length} expired tokens...`)
    const chunkSize = 1000
    for (let i = 0; i < verificationTokens.length; i += chunkSize) {
      const chunk = verificationTokens.slice(i, i + chunkSize)
      await prisma.verificationToken.deleteMany({
        where: {
          token: {
            in: chunk.map((verificationToken) => verificationToken.token),
          },
        },
      })
    }
  } while (totalVerificationTokens === 80000)
  console.log('Done!')
}

const resetBillingProps = async () => {
  console.log('Resetting billing props...')
  const { count } = await prisma.workspace.updateMany({
    where: {
      OR: [
        {
          isQuarantined: true,
        },
        {
          chatsLimitFirstEmailSentAt: { not: null },
        },
      ],
    },
    data: {
      isQuarantined: false,
      chatsLimitFirstEmailSentAt: null,
      chatsLimitSecondEmailSentAt: null,
    },
  })
  console.log(`Resetted ${count} workspaces.`)
}

const deleteResultsFromArchivedMozbotsIfAny = async (
  mozbotIds: { id: string }[]
) => {
  console.log('Checking for archived mozbots with non-archived results...')
  const archivedMozbotsWithResults = (await prisma.mozbot.findMany({
    where: {
      id: {
        in: mozbotIds.map((mozbot) => mozbot.id),
      },
      isArchived: true,
      results: {
        some: {},
      },
    },
    select: {
      id: true,
      groups: true,
    },
  })) as Pick<Mozbot, 'groups' | 'id'>[]
  if (archivedMozbotsWithResults.length === 0) return
  console.log(
    `Found ${archivedMozbotsWithResults.length} archived mozbots with non-archived results.`
  )
  for (const archivedMozbot of archivedMozbotsWithResults) {
    await archiveResults(prisma)({
      mozbot: archivedMozbot,
      resultsFilter: {
        mozbotId: archivedMozbot.id,
      },
    })
  }
  console.log('Delete archived results...')
  await deleteArchivedResults()
}

cleanDatabase().then()
