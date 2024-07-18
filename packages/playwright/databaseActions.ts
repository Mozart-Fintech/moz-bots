import {
  Plan,
  Prisma,
  PrismaClient,
  User,
  Workspace,
  WorkspaceRole,
} from '@mozbot.io/prisma'
import { createId } from '@mozbot.io/lib/createId'
import { Mozbot, MozbotV6, HttpRequest } from '@mozbot.io/schemas'
import { readFileSync } from 'fs'
import { proWorkspaceId, userId } from './databaseSetup'
import { parseTestMozbot, parseMozbotToPublicMozbot } from './databaseHelpers'

const prisma = new PrismaClient()

type CreateFakeResultsProps = {
  mozbotId: string
  count: number
  customResultIdPrefix?: string
  isChronological?: boolean
}

export const injectFakeResults = async ({
  count,
  customResultIdPrefix,
  mozbotId,
  isChronological,
}: CreateFakeResultsProps) => {
  const resultIdPrefix = customResultIdPrefix ?? createId()
  await prisma.result.createMany({
    data: [
      ...Array.from(Array(count)).map((_, idx) => {
        const today = new Date()
        const rand = Math.random()
        return {
          id: `${resultIdPrefix}-result${idx}`,
          mozbotId,
          createdAt: isChronological
            ? new Date(
                today.setTime(today.getTime() + 1000 * 60 * 60 * 24 * idx)
              )
            : new Date(),
          isCompleted: rand > 0.5,
          hasStarted: true,
          variables: [],
        } satisfies Prisma.ResultCreateManyInput
      }),
    ],
  })
  return createAnswers({ resultIdPrefix, count })
}

const createAnswers = ({
  count,
  resultIdPrefix,
}: { resultIdPrefix: string } & Pick<CreateFakeResultsProps, 'count'>) => {
  return prisma.answerV2.createMany({
    data: [
      ...Array.from(Array(count)).map((_, idx) => ({
        resultId: `${resultIdPrefix}-result${idx}`,
        content: `content${idx}`,
        blockId: 'block1',
      })),
    ],
  })
}

export const importMozbotInDatabase = async (
  path: string,
  updates?: Partial<Mozbot>
) => {
  const mozbotFile = JSON.parse(readFileSync(path).toString())
  const mozbot = {
    events: null,
    ...mozbotFile,
    workspaceId: proWorkspaceId,
    ...updates,
  }
  await prisma.mozbot.create({
    data: parseCreateMozbot(mozbot),
  })
  return prisma.publicMozbot.create({
    data: {
      ...parseMozbotToPublicMozbot(
        updates?.id ? `${updates?.id}-public` : 'publicBot',
        mozbot
      ),
      events: mozbot.events === null ? Prisma.DbNull : mozbot.events,
    },
  })
}

export const deleteWorkspaces = async (workspaceIds: string[]) => {
  await prisma.workspace.deleteMany({
    where: { id: { in: workspaceIds } },
  })
}

export const deleteMozbots = async (mozbotIds: string[]) => {
  await prisma.mozbot.deleteMany({
    where: { id: { in: mozbotIds } },
  })
}

export const deleteCredentials = async (credentialIds: string[]) => {
  await prisma.credentials.deleteMany({
    where: { id: { in: credentialIds } },
  })
}

export const deleteWebhooks = async (webhookIds: string[]) => {
  await prisma.webhook.deleteMany({
    where: { id: { in: webhookIds } },
  })
}

export const createWorkspaces = async (workspaces: Partial<Workspace>[]) => {
  const workspaceIds = workspaces.map((workspace) => workspace.id ?? createId())
  await prisma.workspace.createMany({
    data: workspaces.map((workspace, index) => ({
      id: workspaceIds[index],
      name: 'Free workspace',
      plan: Plan.FREE,
      ...workspace,
    })),
  })
  await prisma.memberInWorkspace.createMany({
    data: workspaces.map((_, index) => ({
      userId,
      workspaceId: workspaceIds[index],
      role: WorkspaceRole.ADMIN,
    })),
  })
  return workspaceIds
}

export const updateUser = (data: Partial<User>) =>
  prisma.user.update({
    data: {
      ...data,
      onboardingCategories: data.onboardingCategories ?? [],
      displayedInAppNotifications:
        data.displayedInAppNotifications ?? Prisma.DbNull,
    },
    where: {
      id: userId,
    },
  })

export const createMozbots = async (partialMozbots: Partial<MozbotV6>[]) => {
  const mozbotsWithId = partialMozbots.map((mozbot) => {
    const mozbotId = mozbot.id ?? createId()
    return {
      ...mozbot,
      id: mozbotId,
      publicId: mozbot.publicId ?? mozbotId + '-public',
    }
  })
  await prisma.mozbot.createMany({
    data: mozbotsWithId.map(parseTestMozbot).map(parseCreateMozbot),
  })
  return prisma.publicMozbot.createMany({
    data: mozbotsWithId.map((t) => ({
      ...parseMozbotToPublicMozbot(t.publicId, parseTestMozbot(t)),
    })) as any,
  })
}

export const updateMozbot = async (
  partialMozbot: Partial<Mozbot> & { id: string }
) => {
  await prisma.mozbot.updateMany({
    where: { id: partialMozbot.id },
    data: parseUpdateMozbot(partialMozbot),
  })
  return prisma.publicMozbot.updateMany({
    where: { mozbotId: partialMozbot.id },
    data: {
      ...partialMozbot,
      events:
        partialMozbot.events === null ? Prisma.DbNull : partialMozbot.events,
    },
  })
}

export const updateWorkspace = async (
  id: string,
  data: Prisma.WorkspaceUncheckedUpdateManyInput
) => {
  await prisma.workspace.updateMany({
    where: { id: proWorkspaceId },
    data,
  })
}

export const parseCreateMozbot = (mozbot: Mozbot) => ({
  ...mozbot,
  resultsTablePreferences:
    mozbot.resultsTablePreferences === null
      ? Prisma.DbNull
      : mozbot.resultsTablePreferences,
  events: mozbot.events === null ? Prisma.DbNull : mozbot.events,
})

const parseUpdateMozbot = (mozbot: Partial<Mozbot>) => ({
  ...mozbot,
  resultsTablePreferences:
    mozbot.resultsTablePreferences === null
      ? Prisma.DbNull
      : mozbot.resultsTablePreferences,
  events: mozbot.events === null ? Prisma.DbNull : mozbot.events,
})
