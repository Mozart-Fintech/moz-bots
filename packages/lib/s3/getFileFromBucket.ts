import { env } from '@mozbot.io/env'
import { Client } from 'minio'
import type { Readable as ReadableStream } from 'node:stream'

type Props = {
  url: string
}

const streamToBuffer = async (stream: ReadableStream): Promise<Buffer> => {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export const getFileFromBucket = async ({ url }: Props): Promise<Buffer> => {
  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY)
    throw new Error(
      'S3 not properly configured. Missing one of those variables: S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY'
    )

  const minioClient = new Client({
    endPoint: env.S3_ENDPOINT,
    port: env.S3_PORT,
    useSSL: env.S3_SSL,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
    region: env.S3_REGION,
  })

  const fileStream = await minioClient.getObject(env.S3_BUCKET, url)

  const fileBuffer = await streamToBuffer(fileStream)

  return fileBuffer
}
