import { publicProcedure } from '@/helpers/server/trpc'
import { TRPCError } from '@trpc/server'
import {
  Block,
  FileInputBlock,
  MozbotLinkBlock,
  parseGroups,
} from '@mozbot.io/schemas'
import { byId, isDefined } from '@mozbot.io/lib'
import { z } from 'zod'
import { generatePresignedUrl } from '@mozbot.io/lib/s3/deprecated/generatePresignedUrl'
import { env } from '@mozbot.io/env'
import prisma from '@mozbot.io/lib/prisma'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'
import { LogicBlockType } from '@mozbot.io/schemas/features/blocks/logic/constants'
import { PublicMozbot } from '@mozbot.io/prisma'

export const getUploadUrl = publicProcedure
  .meta({
    openapi: {
      method: 'GET',
      path: '/v1/mozbots/{mozbotId}/blocks/{blockId}/storage/upload-url',
      summary: 'Obtener la URL de carga de un archivo',
      description:
        'Se utiliza para que el cliente web obtenga el archivo de carga del depósito.',
      deprecated: true,
      tags: ['Deprecated'],
    },
  })
  .input(
    z.object({
      mozbotId: z.string(),
      blockId: z.string(),
      filePath: z.string(),
      fileType: z.string().optional(),
    })
  )
  .output(
    z.object({
      presignedUrl: z.string(),
      hasReachedStorageLimit: z.boolean(),
    })
  )
  .query(async ({ input: { mozbotId, blockId, filePath, fileType } }) => {
    if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message:
          'S3 no está configurado correctamente. Falta una de esas variables: S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY',
      })

    const publicMozbot = await prisma.publicMozbot.findFirst({
      where: { mozbotId },
      select: {
        version: true,
        groups: true,
        mozbotId: true,
      },
    })

    if (!publicMozbot)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Mozbot no encontrado',
      })

    const fileUploadBlock = await getFileUploadBlock(publicMozbot, blockId)

    if (!fileUploadBlock)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Bloque de carga de archivos no encontrado',
      })

    const presignedUrl = await generatePresignedUrl({
      fileType,
      filePath,
    })

    return {
      presignedUrl,
      hasReachedStorageLimit: false,
    }
  })

const getFileUploadBlock = async (
  publicMozbot: Pick<PublicMozbot, 'groups' | 'mozbotId' | 'version'>,
  blockId: string
): Promise<FileInputBlock | null> => {
  const groups = parseGroups(publicMozbot.groups, {
    mozbotVersion: publicMozbot.version,
  })
  const fileUploadBlock = groups
    .flatMap<Block>((group) => group.blocks)
    .find(byId(blockId))
  if (fileUploadBlock?.type === InputBlockType.FILE) return fileUploadBlock
  const linkedmozbotIds = groups
    .flatMap<Block>((group) => group.blocks)
    .filter((block) => block.type === LogicBlockType.MOZBOT_LINK)
    .flatMap((block) => (block as MozbotLinkBlock).options?.mozbotId)
    .filter(isDefined)
  const linkedMozbots = await prisma.publicMozbot.findMany({
    where: { mozbotId: { in: linkedmozbotIds } },
    select: {
      groups: true,
    },
  })
  const fileUploadBlockFromLinkedMozbots = parseGroups(
    linkedMozbots.flatMap((mozbot) => mozbot.groups),
    { mozbotVersion: publicMozbot.version }
  )
    .flatMap<Block>((group) => group.blocks)
    .find(byId(blockId))
  if (fileUploadBlockFromLinkedMozbots?.type === InputBlockType.FILE)
    return fileUploadBlockFromLinkedMozbots
  return null
}
