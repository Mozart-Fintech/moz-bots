import prisma from '@mozbot.io/lib/prisma'
import { Log } from '@mozbot.io/schemas'

export const saveLogs = (logs: Omit<Log, 'id' | 'createdAt'>[]) =>
  prisma.log.createMany({ data: logs })
