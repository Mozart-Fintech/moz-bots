import prisma from '@mozbot.io/lib/prisma'
import { authenticatedProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import {
  edgeSchema,
  settingsSchema,
  themeSchema,
  variableSchema,
  parseGroups,
  startEventSchema,
} from '@mozbot.io/schemas'
import { z } from 'zod'
import { isWriteMozbotForbidden } from '../helpers/isWriteMozbotForbidden'
import { Plan } from '@mozbot.io/prisma'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'
import { computeRiskLevel } from '@mozbot.io/radar'
import { env } from '@mozbot.io/env'
import { trackEvents } from '@mozbot.io/telemetry/trackEvents'
import { parseMozbotPublishEvents } from '@/features/telemetry/helpers/parseMozbotPublishEvents'

export const publishMozbot = authenticatedProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/mozbots/{mozbotId}/publish',
      protect: true,
      summary: 'Publish a mozbot',
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
    })
  )
  .output(
    z.object({
      message: z.literal('success'),
    })
  )
  .mutation(async ({ input: { mozbotId }, ctx: { user } }) => {
    const existingMozbot = await prisma.mozbot.findFirst({
      where: {
        id: mozbotId,
      },
      include: {
        collaborators: true,
        publishedMozbot: true,
        workspace: {
          select: {
            plan: true,
            isVerified: true,
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

    const hasFileUploadBlocks = parseGroups(existingMozbot.groups, {
      mozbotVersion: existingMozbot.version,
    }).some((group) =>
      group.blocks.some((block) => block.type === InputBlockType.FILE)
    )

    if (hasFileUploadBlocks && existingMozbot.workspace.plan === Plan.FREE)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message:
          'Los bloques de carga de archivos no se pueden publicar en el plan gratuito',
      })

    const mozbotWasVerified =
      existingMozbot.riskLevel === -1 || existingMozbot.workspace.isVerified

    if (
      !mozbotWasVerified &&
      existingMozbot.riskLevel &&
      existingMozbot.riskLevel > 80
    )
      throw new TRPCError({
        code: 'FORBIDDEN',
        message:
          'El radar detectó un posible mozbot malicioso. Este bot está siendo revisado manualmente por el equipo de Prevención de Fraude.',
      })

    const riskLevel = mozbotWasVerified
      ? 0
      : computeRiskLevel(existingMozbot, {
          debug: env.NODE_ENV === 'development',
        })

    if (riskLevel > 0 && riskLevel !== existingMozbot.riskLevel) {
      if (env.MESSAGE_WEBHOOK_URL && riskLevel !== 100 && riskLevel > 60)
        await fetch(env.MESSAGE_WEBHOOK_URL, {
          method: 'POST',
          body: `⚠️ Mozbot sospechoso a revisar: ${existingMozbot.name} (${env.NEXTAUTH_URL}/mozbots/${existingMozbot.id}/edit) (espacio de trabajo: ${existingMozbot.workspaceId})`,
        }).catch((err) => {
          console.error('No se pudo enviar el mensaje', err)
        })

      await prisma.mozbot.updateMany({
        where: {
          id: existingMozbot.id,
        },
        data: {
          riskLevel,
        },
      })
      if (riskLevel > 80) {
        if (existingMozbot.publishedMozbot)
          await prisma.publicMozbot.deleteMany({
            where: {
              id: existingMozbot.publishedMozbot.id,
            },
          })
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'El radar detectó un posible mozbot malicioso. Este bot está siendo revisado manualmente por el equipo de Prevención de Fraude.',
        })
      }
    }

    const publishEvents = await parseMozbotPublishEvents({
      existingMozbot,
      userId: user.id,
      hasFileUploadBlocks,
    })

    if (existingMozbot.publishedMozbot)
      await prisma.publicMozbot.updateMany({
        where: {
          id: existingMozbot.publishedMozbot.id,
        },
        data: {
          version: existingMozbot.version,
          edges: z.array(edgeSchema).parse(existingMozbot.edges),
          groups: parseGroups(existingMozbot.groups, {
            mozbotVersion: existingMozbot.version,
          }),
          events:
            (existingMozbot.version === '6'
              ? z.tuple([startEventSchema])
              : z.null()
            ).parse(existingMozbot.events) ?? undefined,
          settings: settingsSchema.parse(existingMozbot.settings),
          variables: z.array(variableSchema).parse(existingMozbot.variables),
          theme: themeSchema.parse(existingMozbot.theme),
        },
      })
    else
      await prisma.publicMozbot.createMany({
        data: {
          version: existingMozbot.version,
          mozbotId: existingMozbot.id,
          edges: z.array(edgeSchema).parse(existingMozbot.edges),
          groups: parseGroups(existingMozbot.groups, {
            mozbotVersion: existingMozbot.version,
          }),
          events:
            (existingMozbot.version === '6'
              ? z.tuple([startEventSchema])
              : z.null()
            ).parse(existingMozbot.events) ?? undefined,
          settings: settingsSchema.parse(existingMozbot.settings),
          variables: z.array(variableSchema).parse(existingMozbot.variables),
          theme: themeSchema.parse(existingMozbot.theme),
        },
      })

    await trackEvents([
      ...publishEvents,
      {
        name: 'Mozbot published',
        workspaceId: existingMozbot.workspaceId,
        mozbotId: existingMozbot.id,
        userId: user.id,
        data: {
          name: existingMozbot.name,
          isFirstPublish: existingMozbot.publishedMozbot ? undefined : true,
        },
      },
    ])

    return { message: 'success' }
  })
