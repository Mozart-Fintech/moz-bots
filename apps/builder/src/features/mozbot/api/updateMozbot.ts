import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import {
  mozbotSchema,
  mozbotV5Schema,
  mozbotV6Schema,
} from '@mozbot.io/schemas'
import { z } from 'zod'
import {
  isCustomDomainNotAvailable,
  isPublicIdNotAvailable,
  sanitizeCustomDomain,
  sanitizeGroups,
  sanitizeSettings,
  sanitizeVariables,
} from '../helpers/sanitizers'
import { isWriteMozbotForbidden } from '../helpers/isWriteMozbotForbidden'
import { isCloudProdInstance } from '@/helpers/isCloudProdInstance'
import { Prisma } from '@mozbot.io/prisma'
import { migrateMozbot } from '@mozbot.io/migrations/migrateMozbot'

const mozbotUpdateSchemaPick = {
  version: true,
  name: true,
  icon: true,
  selectedThemeTemplateId: true,
  groups: true,
  theme: true,
  settings: true,
  folderId: true,
  variables: true,
  edges: true,
  resultsTablePreferences: true,
  publicId: true,
  customDomain: true,
  isClosed: true,
  whatsAppCredentialsId: true,
  riskLevel: true,
  events: true,
  updatedAt: true,
} as const

export const updateMozbot = authenticatedProcedure
  .meta({
    openapi: {
      method: 'PATCH',
      path: '/v1/mozbots/{mozbotId}',
      protect: true,
      summary: 'Update a mozbot',
      tags: ['Mozbot'],
    },
  })
  .input(
    z.object({
      mozbotId: z
        .string()
        .describe(
          '[¿Dónde encontrar el ID de mi bot?](../how-to#how-to-find-my-mozbotId)'
        ),
      mozbot: z.union([
        mozbotV6Schema.pick(mozbotUpdateSchemaPick).partial().openapi({
          title: 'Mozbot V6',
        }),
        mozbotV5Schema._def.schema
          .pick(mozbotUpdateSchemaPick)
          .partial()
          .openapi({
            title: 'Mozbot V5',
          }),
      ]),
    })
  )
  .output(
    z.object({
      mozbot: mozbotV6Schema,
    })
  )
  .mutation(async ({ input: { mozbotId, mozbot }, ctx: { user } }) => {
    const existingMozbot = await prisma.mozbot.findFirst({
      where: {
        id: mozbotId,
      },
      select: {
        version: true,
        id: true,
        customDomain: true,
        publicId: true,
        collaborators: {
          select: {
            userId: true,
            type: true,
          },
        },
        workspace: {
          select: {
            id: true,
            plan: true,
            isSuspended: true,
            isPastDue: true,
            members: {
              select: {
                userId: true,
                role: true,
              },
            },
          },
        },
        updatedAt: true,
      },
    })

    if (
      !existingMozbot?.id ||
      (await isWriteMozbotForbidden(existingMozbot, user))
    )
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Mozbot no encontrado',
      })

    if (
      mozbot.updatedAt &&
      existingMozbot.updatedAt.getTime() > mozbot.updatedAt.getTime()
    )
      throw new TRPCError({
        code: 'CONFLICT',
        message:
          'Se encontró una versión más nueva del mozbot en la base de datos.',
      })

    if (
      mozbot.customDomain &&
      existingMozbot.customDomain !== mozbot.customDomain &&
      (await isCustomDomainNotAvailable({
        customDomain: mozbot.customDomain,
        workspaceId: existingMozbot.workspace.id,
      }))
    )
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Dominio personalizado no disponible',
      })

    if (mozbot.publicId) {
      if (isCloudProdInstance() && mozbot.publicId.length < 4)
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'La identificación pública debe tener al menos 4 caracteres.',
        })
      if (
        existingMozbot.publicId !== mozbot.publicId &&
        (await isPublicIdNotAvailable(mozbot.publicId))
      )
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Identificación pública no disponible',
        })
    }

    const groups = mozbot.groups
      ? await sanitizeGroups(existingMozbot.workspace.id)(mozbot.groups)
      : undefined

    const newMozbot = await prisma.mozbot.update({
      where: {
        id: existingMozbot.id,
      },
      data: {
        version: mozbot.version ?? undefined,
        name: mozbot.name,
        icon: mozbot.icon,
        selectedThemeTemplateId: mozbot.selectedThemeTemplateId,
        events: mozbot.events ?? undefined,
        groups,
        theme: mozbot.theme ? mozbot.theme : undefined,
        settings: mozbot.settings
          ? sanitizeSettings(
              mozbot.settings,
              existingMozbot.workspace.plan,
              'update'
            )
          : undefined,
        folderId: mozbot.folderId,
        variables:
          mozbot.variables && groups
            ? sanitizeVariables({
                variables: mozbot.variables,
                groups,
              })
            : undefined,
        edges: mozbot.edges,
        resultsTablePreferences:
          mozbot.resultsTablePreferences === null
            ? Prisma.DbNull
            : mozbot.resultsTablePreferences,
        publicId:
          mozbot.publicId === null
            ? null
            : mozbot.publicId && isPublicIdValid(mozbot.publicId)
            ? mozbot.publicId
            : undefined,
        customDomain: await sanitizeCustomDomain({
          customDomain: mozbot.customDomain,
          workspaceId: existingMozbot.workspace.id,
        }),
        isClosed: mozbot.isClosed,
        whatsAppCredentialsId: mozbot.whatsAppCredentialsId ?? undefined,
      },
    })

    const migratedMozbot = await migrateMozbot(mozbotSchema.parse(newMozbot))

    return { mozbot: migratedMozbot }
  })

const isPublicIdValid = (str: string) =>
  /^([a-z0-9]+-[a-z0-9]*)*$/.test(str) || /^[a-z0-9]*$/.test(str)
