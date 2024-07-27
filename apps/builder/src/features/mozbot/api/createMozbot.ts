import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { Plan, WorkspaceRole } from '@mozbot.io/prisma'
import { MozbotV6, mozbotV6Schema } from '@mozbot.io/schemas'
import { z } from 'zod'
import { getUserRoleInWorkspace } from '@/features/workspace/helpers/getUserRoleInWorkspace'
import {
  isCustomDomainNotAvailable,
  isPublicIdNotAvailable,
  sanitizeGroups,
  sanitizeSettings,
  sanitizeVariables,
} from '../helpers/sanitizers'
import { createId } from '@paralleldrive/cuid2'
import { EventType } from '@mozbot.io/schemas/features/events/constants'
import { trackEvents } from '@mozbot.io/telemetry/trackEvents'

const mozbotCreateSchemaPick = {
  name: true,
  icon: true,
  selectedThemeTemplateId: true,
  groups: true,
  events: true,
  theme: true,
  settings: true,
  folderId: true,
  variables: true,
  edges: true,
  resultsTablePreferences: true,
  publicId: true,
  customDomain: true,
} as const

export const createMozbot = authenticatedProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/mozbots',
      protect: true,
      summary: 'Crear un mozbot',
      tags: ['Mozbot'],
    },
  })
  .input(
    z.object({
      workspaceId: z.string(),
      mozbot: mozbotV6Schema.pick(mozbotCreateSchemaPick).partial(),
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

    if (
      mozbot.customDomain &&
      (await isCustomDomainNotAvailable({
        customDomain: mozbot.customDomain,
        workspaceId,
      }))
    )
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Dominio personalizado no disponible',
      })

    if (mozbot.publicId && (await isPublicIdNotAvailable(mozbot.publicId)))
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Identificación pública no disponible',
      })

    if (mozbot.folderId) {
      const existingFolder = await prisma.dashboardFolder.findUnique({
        where: {
          id: mozbot.folderId,
        },
      })
      if (!existingFolder) mozbot.folderId = null
    }

    const groups = (
      mozbot.groups ? await sanitizeGroups(workspaceId)(mozbot.groups) : []
    ) as MozbotV6['groups']
    const newMozbot = await prisma.mozbot.create({
      data: {
        version: '6',
        workspaceId,
        name: mozbot.name ?? 'Mi mozbot',
        icon: mozbot.icon,
        selectedThemeTemplateId: mozbot.selectedThemeTemplateId,
        groups,
        events: mozbot.events ?? [
          {
            type: EventType.START,
            graphCoordinates: { x: 0, y: 0 },
            id: createId(),
          },
        ],
        theme: mozbot.theme ? mozbot.theme : {},
        settings: mozbot.settings
          ? sanitizeSettings(mozbot.settings, workspace.plan, 'create')
          : workspace.plan === Plan.FREE
          ? {
              general: { isBrandingEnabled: true },
            }
          : {},
        folderId: mozbot.folderId,
        variables: mozbot.variables
          ? sanitizeVariables({ variables: mozbot.variables, groups })
          : [],
        edges: mozbot.edges ?? [],
        resultsTablePreferences: mozbot.resultsTablePreferences ?? undefined,
        publicId: mozbot.publicId ?? undefined,
        customDomain: mozbot.customDomain ?? undefined,
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
