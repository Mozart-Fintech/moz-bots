import { authenticatedProcedure } from '@/helpers/server/trpc'
import { z } from 'zod'
import { env } from '@mozbot.io/env'
import { TRPCError } from '@trpc/server'
import { generatePresignedPostPolicy } from '@mozbot.io/lib/s3/generatePresignedPostPolicy'
import prisma from '@mozbot.io/lib/prisma'
import { isWriteWorkspaceForbidden } from '@/features/workspace/helpers/isWriteWorkspaceForbidden'
import { isWriteMozbotForbidden } from '@/features/mozbot/helpers/isWriteMozbotForbidden'

const inputSchema = z.object({
  filePathProps: z
    .object({
      workspaceId: z.string(),
      mozbotId: z.string(),
      blockId: z.string(),
      itemId: z.string().optional(),
    })
    .or(
      z.object({
        workspaceId: z.string(),
        mozbotId: z.string(),
        fileName: z.string(),
      })
    )
    .or(
      z.object({
        userId: z.string(),
        fileName: z.string(),
      })
    )
    .or(
      z.object({
        workspaceId: z.string(),
        fileName: z.string(),
      })
    ),
  fileType: z.string().optional(),
})

export type FilePathUploadProps = z.infer<
  typeof inputSchema.shape.filePathProps
>

export const generateUploadUrl = authenticatedProcedure
  .input(inputSchema)
  .mutation(async ({ input: { filePathProps, fileType }, ctx: { user } }) => {
    if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message:
          'S3 no está configurado correctamente. Falta una de esas variables: S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY',
      })

    if ('resultId' in filePathProps && !user)
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Debes iniciar sesión para cargar un archivo',
      })

    const filePath = await parseFilePath({
      authenticatedUserId: user?.id,
      uploadProps: filePathProps,
    })

    const presignedPostPolicy = await generatePresignedPostPolicy({
      fileType,
      filePath,
    })

    return {
      presignedUrl: presignedPostPolicy.postURL,
      formData: presignedPostPolicy.formData,
      fileUrl: env.S3_PUBLIC_CUSTOM_DOMAIN
        ? `${env.S3_PUBLIC_CUSTOM_DOMAIN}/${filePath}`
        : `${presignedPostPolicy.postURL}/${presignedPostPolicy.formData.key}`,
    }
  })

type Props = {
  authenticatedUserId?: string
  uploadProps: FilePathUploadProps
}

const parseFilePath = async ({
  authenticatedUserId,
  uploadProps: input,
}: Props): Promise<string> => {
  if (!authenticatedUserId)
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Debes iniciar sesión para cargar este tipo de archivo',
    })
  if ('userId' in input) {
    if (input.userId !== authenticatedUserId)
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'No estás autorizado a cargar un archivo para este usuario.',
      })
    return `public/users/${input.userId}/${input.fileName}`
  }
  if (!('workspaceId' in input))
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Falta el workspaceId',
    })
  if (!('mozbotId' in input)) {
    const workspace = await prisma.workspace.findUnique({
      where: {
        id: input.workspaceId,
      },
      select: {
        members: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    })
    if (
      !workspace ||
      isWriteWorkspaceForbidden(workspace, { id: authenticatedUserId })
    )
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Espacio de trabajo no encontrado',
      })
    return `public/workspaces/${input.workspaceId}/${input.fileName}`
  }
  const mozbot = await prisma.mozbot.findUnique({
    where: {
      id: input.mozbotId,
    },
    select: {
      workspace: {
        select: {
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
      collaborators: {
        select: {
          userId: true,
          type: true,
        },
      },
    },
  })
  if (
    !mozbot ||
    (await isWriteMozbotForbidden(mozbot, {
      id: authenticatedUserId,
    }))
  )
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Mozbot no encontrado',
    })
  if (!('blockId' in input)) {
    return `public/workspaces/${input.workspaceId}/mozbots/${input.mozbotId}/${input.fileName}`
  }
  return `public/workspaces/${input.workspaceId}/mozbots/${
    input.mozbotId
  }/blocks/${input.blockId}${input.itemId ? `/items/${input.itemId}` : ''}`
}
