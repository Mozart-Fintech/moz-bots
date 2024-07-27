import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { Plan, WorkspaceRole } from '@mozbot.io/prisma'
import {
  Mozbot,
  MozbotV6,
  resultsTablePreferencesSchema,
  mozbotV5Schema,
  mozbotV6Schema,
} from '@mozbot.io/schemas'
import { z } from 'zod'
import { getUserRoleInWorkspace } from '@/features/workspace/helpers/getUserRoleInWorkspace'
import {
  sanitizeFolderId,
  sanitizeGroups,
  sanitizeSettings,
  sanitizeVariables,
} from '../helpers/sanitizers'
import { preprocessMozbot } from '@mozbot.io/schemas/features/mozbot/helpers/preprocessMozbot'
import { migrateMozbot } from '@mozbot.io/migrations/migrateMozbot'
import { trackEvents } from '@mozbot.io/telemetry/trackEvents'

const omittedProps = {
  id: true,
  whatsAppCredentialsId: true,
  riskLevel: true,
  isClosed: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
  customDomain: true,
  workspaceId: true,
  resultsTablePreferencesSchema: true,
  selectedThemeTemplateId: true,
  publicId: true,
} as const

const importingMozbotSchema = z.preprocess(
  preprocessMozbot,
  z.discriminatedUnion('version', [
    mozbotV6Schema
      .omit(omittedProps)
      .extend({
        resultsTablePreferences: resultsTablePreferencesSchema.nullish(),
        selectedThemeTemplateId: z.string().nullish(),
      })
      .openapi({
        title: 'Mozbot V6',
      }),
    mozbotV5Schema._def.schema
      .omit(omittedProps)
      .extend({
        resultsTablePreferences: resultsTablePreferencesSchema.nullish(),
        selectedThemeTemplateId: z.string().nullish(),
      })
      .openapi({
        title: 'Mozbot V5',
      }),
  ])
)

type ImportingMozbot = z.infer<typeof importingMozbotSchema>

const migrateImportingMozbot = (mozbot: ImportingMozbot): Promise<MozbotV6> => {
  const fullMozbot = {
    ...mozbot,
    id: 'dummy id',
    workspaceId: 'dummy workspace id',
    resultsTablePreferences: mozbot.resultsTablePreferences ?? null,
    selectedThemeTemplateId: mozbot.selectedThemeTemplateId ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customDomain: null,
    isClosed: false,
    isArchived: false,
    whatsAppCredentialsId: null,
    publicId: null,
    riskLevel: null,
  } satisfies Mozbot
  return migrateMozbot(fullMozbot)
}

export const importMozbot = authenticatedProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/mozbots/import',
      protect: true,
      summary: 'Import a mozbot',
      tags: ['Mozbot'],
    },
  })
  .input(
    z.object({
      workspaceId: z
        .string()
        .describe(
          '[¿Dónde encontrar el ID de mi espacio de trabajo?](../how-to#how-to-find-my-workspaceid)'
        ),
      mozbot: importingMozbotSchema,
    })
  )
  .output(
    z.object({
      mozbot: mozbotV6Schema,
    })
  )
  .mutation(async ({ input: { mozbot, workspaceId }, ctx: { user } }) => {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, members: true, plan: true },
    })
    const userRole = getUserRoleInWorkspace(user.id, workspace?.members)
    if (
      userRole === undefined ||
      userRole === WorkspaceRole.GUEST ||
      !workspace
    )
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Espacio de trabajo no encontrado',
      })

    const migratedMozbot = await migrateImportingMozbot(mozbot)

    const groups = (
      migratedMozbot.groups
        ? await sanitizeGroups(workspaceId)(migratedMozbot.groups)
        : []
    ) as MozbotV6['groups']

    const newMozbot = await prisma.mozbot.create({
      data: {
        version: '6',
        workspaceId,
        name: migratedMozbot.name,
        icon: migratedMozbot.icon,
        selectedThemeTemplateId: migratedMozbot.selectedThemeTemplateId,
        groups,
        events: migratedMozbot.events ?? undefined,
        theme: migratedMozbot.theme ? migratedMozbot.theme : {},
        settings: migratedMozbot.settings
          ? sanitizeSettings(migratedMozbot.settings, workspace.plan, 'create')
          : workspace.plan === Plan.FREE
          ? {
              general: {
                isBrandingEnabled: true,
              },
            }
          : {},
        folderId: await sanitizeFolderId({
          folderId: migratedMozbot.folderId,
          workspaceId: workspace.id,
        }),
        variables: migratedMozbot.variables
          ? sanitizeVariables({ variables: migratedMozbot.variables, groups })
          : [],
        edges: migratedMozbot.edges ?? [],
        resultsTablePreferences:
          migratedMozbot.resultsTablePreferences ?? undefined,
      } satisfies Partial<MozbotV6>,
    })

    const parsedNewMozbot = mozbotV6Schema.parse(newMozbot)

    await trackEvents([
      {
        name: 'Mozbot created',
        workspaceId: parsedNewMozbot.workspaceId,
        mozbotId: parsedNewMozbot.id,
        userId: user.id,
        data: {
          name: newMozbot.name,
        },
      },
    ])

    return { mozbot: parsedNewMozbot }
  })
