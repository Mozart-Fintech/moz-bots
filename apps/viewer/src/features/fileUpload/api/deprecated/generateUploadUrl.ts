import { publicProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { generatePresignedPostPolicy } from '@mozbot.io/lib/s3/generatePresignedPostPolicy'
import { env } from '@mozbot.io/env'
import prisma from '@mozbot.io/lib/prisma'
import { getSession } from '@mozbot.io/bot-engine/queries/getSession'
import { parseGroups } from '@mozbot.io/schemas'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'
import { getBlockById } from '@mozbot.io/schemas/helpers'

export const generateUploadUrl = publicProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v1/generate-upload-url',
      summary: 'Generar URL de carga',
      description:
        'Se utiliza para cargar cualquier cosa desde el cliente al depósito S3.',
    },
  })
  .input(
    z.object({
      filePathProps: z
        .object({
          mozbotId: z.string(),
          blockId: z.string(),
          resultId: z.string(),
          fileName: z.string(),
        })
        .or(
          z.object({
            sessionId: z.string(),
            fileName: z.string(),
          })
        ),
      fileType: z.string().optional(),
    })
  )
  .output(
    z.object({
      presignedUrl: z.string(),
      formData: z.record(z.string(), z.any()),
      fileUrl: z.string(),
    })
  )
  .mutation(async ({ input: { filePathProps, fileType } }) => {
    if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message:
          'S3 no está configurado correctamente. Falta una de esas variables: S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY',
      })

    if ('mozbotId' in filePathProps) {
      const publicMozbot = await prisma.publicMozbot.findFirst({
        where: {
          mozbotId: filePathProps.mozbotId,
        },
        select: {
          version: true,
          groups: true,
          mozbot: {
            select: {
              workspaceId: true,
            },
          },
        },
      })

      const workspaceId = publicMozbot?.mozbot.workspaceId

      if (!workspaceId)
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No puedo encontrar el workspaceId',
        })

      const filePath = `public/workspaces/${workspaceId}/mozbots/${filePathProps.mozbotId}/results/${filePathProps.resultId}/${filePathProps.fileName}`

      const fileUploadBlock = parseGroups(publicMozbot.groups, {
        mozbotVersion: publicMozbot.version,
      })
        .flatMap((group) => group.blocks)
        .find((block) => block.id === filePathProps.blockId)

      if (fileUploadBlock?.type !== InputBlockType.FILE)
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No puedo encontrar el bloque de carga de archivos',
        })

      const presignedPostPolicy = await generatePresignedPostPolicy({
        fileType,
        filePath,
        maxFileSize:
          fileUploadBlock.options?.sizeLimit ??
          env.NEXT_PUBLIC_BOT_FILE_UPLOAD_MAX_SIZE,
      })

      return {
        presignedUrl: presignedPostPolicy.postURL,
        formData: presignedPostPolicy.formData,
        fileUrl: env.S3_PUBLIC_CUSTOM_DOMAIN
          ? `${env.S3_PUBLIC_CUSTOM_DOMAIN}/${filePath}`
          : `${presignedPostPolicy.postURL}/${presignedPostPolicy.formData.key}`,
      }
    }

    const session = await getSession(filePathProps.sessionId)

    if (!session)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No puedo encontrar la sesión',
      })

    const mozbotId = session.state.mozbotsQueue[0].mozbot.id

    const publicMozbot = await prisma.publicMozbot.findFirst({
      where: {
        mozbotId,
      },
      select: {
        version: true,
        groups: true,
        mozbot: {
          select: {
            workspaceId: true,
          },
        },
      },
    })

    const workspaceId = publicMozbot?.mozbot.workspaceId

    if (!workspaceId)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No puedo encontrar el workspaceId',
      })

    if (session.state.currentBlockId === undefined)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No puedo encontrar currentBlockId en el estado de sesión',
      })

    const { block: fileUploadBlock } = getBlockById(
      session.state.currentBlockId,
      parseGroups(publicMozbot.groups, {
        mozbotVersion: publicMozbot.version,
      })
    )

    if (fileUploadBlock?.type !== InputBlockType.FILE)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No puedo encontrar el bloque de carga de archivos',
      })

    const resultId = session.state.mozbotsQueue[0].resultId

    const filePath = `${
      fileUploadBlock.options?.visibility === 'Private' ? 'private' : 'public'
    }/workspaces/${workspaceId}/mozbots/${mozbotId}/results/${resultId}/${
      filePathProps.fileName
    }`

    const presignedPostPolicy = await generatePresignedPostPolicy({
      fileType,
      filePath,
      maxFileSize:
        fileUploadBlock.options && 'sizeLimit' in fileUploadBlock.options
          ? (fileUploadBlock.options.sizeLimit as number)
          : env.NEXT_PUBLIC_BOT_FILE_UPLOAD_MAX_SIZE,
    })

    return {
      presignedUrl: presignedPostPolicy.postURL,
      formData: presignedPostPolicy.formData,
      fileUrl:
        fileUploadBlock.options?.visibility === 'Private'
          ? `${env.NEXTAUTH_URL}/api/mozbots/${mozbotId}/results/${resultId}/${filePathProps.fileName}`
          : env.S3_PUBLIC_CUSTOM_DOMAIN
          ? `${env.S3_PUBLIC_CUSTOM_DOMAIN}/${filePath}`
          : `${presignedPostPolicy.postURL}/${presignedPostPolicy.formData.key}`,
    }
  })
