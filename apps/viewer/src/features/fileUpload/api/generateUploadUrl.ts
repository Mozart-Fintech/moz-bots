import { publicProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { generatePresignedPostPolicy } from '@mozbot.io/lib/s3/generatePresignedPostPolicy'
import { env } from '@mozbot.io/env'
import prisma from '@mozbot.io/lib/prisma'
import { getSession } from '@mozbot.io/bot-engine/queries/getSession'
import { FileInputBlock, parseGroups, TextInputBlock } from '@mozbot.io/schemas'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'
import { getBlockById } from '@mozbot.io/schemas/helpers'
import { PublicMozbot } from '@mozbot.io/prisma'

export const generateUploadUrl = publicProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/v2/generate-upload-url',
      summary: 'Generate upload URL',
      description: 'Used to upload anything from the client to S3 bucket',
    },
  })
  .input(
    z.object({
      sessionId: z.string(),
      fileName: z.string(),
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
  .mutation(async ({ input: { fileName, sessionId, fileType } }) => {
    if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message:
          'S3 not properly configured. Missing one of those variables: S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY',
      })

    const session = await getSession(sessionId)

    if (!session)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: "Can't find session",
      })

    const mozbotId = session.state.mozbotsQueue[0].mozbot.id

    const isPreview = session.state.mozbotsQueue[0].resultId

    const mozbot = session.state.mozbotsQueue[0].resultId
      ? await getAndParsePublicMozbot(session.state.mozbotsQueue[0].mozbot.id)
      : session.state.mozbotsQueue[0].mozbot

    if (!mozbot?.version)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: "Can't find mozbot",
      })

    if (session.state.currentBlockId === undefined)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: "Can't find currentBlockId in session state",
      })

    const { block } = getBlockById(
      session.state.currentBlockId,
      parseGroups(mozbot.groups, {
        mozbotVersion: mozbot.version,
      })
    )

    if (
      block?.type !== InputBlockType.FILE &&
      (block.type !== InputBlockType.TEXT ||
        !block.options?.attachments?.isEnabled)
    )
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Current block does not expect file upload',
      })

    const { visibility, maxFileSize } = parseFileUploadParams(block)

    const resultId = session.state.mozbotsQueue[0].resultId

    const filePath =
      'workspaceId' in mozbot && mozbot.workspaceId
        ? `${visibility === 'Private' ? 'private' : 'public'}/workspaces/${
            mozbot.workspaceId
          }/mozbots/${mozbotId}/results/${resultId}/${fileName}`
        : `public/tmp/${mozbotId}/${fileName}`

    const presignedPostPolicy = await generatePresignedPostPolicy({
      fileType,
      filePath,
      maxFileSize,
    })

    return {
      presignedUrl: presignedPostPolicy.postURL,
      formData: presignedPostPolicy.formData,
      fileUrl:
        visibility === 'Private' && !isPreview
          ? `${env.NEXTAUTH_URL}/api/mozbots/${mozbotId}/results/${resultId}/${fileName}`
          : env.S3_PUBLIC_CUSTOM_DOMAIN
          ? `${env.S3_PUBLIC_CUSTOM_DOMAIN}/${filePath}`
          : `${presignedPostPolicy.postURL}/${presignedPostPolicy.formData.key}`,
    }
  })

const getAndParsePublicMozbot = async (mozbotId: string) => {
  const publicMozbot = (await prisma.publicMozbot.findFirst({
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
  })) as (PublicMozbot & { mozbot: { workspaceId: string } }) | null

  return {
    ...publicMozbot,
    workspaceId: publicMozbot?.mozbot.workspaceId,
  }
}

const parseFileUploadParams = (
  block: FileInputBlock | TextInputBlock
): { visibility: 'Public' | 'Private'; maxFileSize: number | undefined } => {
  if (block.type === InputBlockType.FILE) {
    return {
      visibility:
        block.options?.visibility === 'Private' ? 'Private' : 'Public',
      maxFileSize:
        block.options && 'sizeLimit' in block.options
          ? (block.options.sizeLimit as number)
          : env.NEXT_PUBLIC_BOT_FILE_UPLOAD_MAX_SIZE,
    }
  }

  return {
    visibility:
      block.options?.attachments?.visibility === 'Private'
        ? 'Private'
        : 'Public',
    maxFileSize: env.NEXT_PUBLIC_BOT_FILE_UPLOAD_MAX_SIZE,
  }
}
