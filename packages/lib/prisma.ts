import { env } from '@mozbot.io/env'
import { PrismaClient } from '@mozbot.io/prisma'

declare const global: { prisma: PrismaClient }
let prisma: PrismaClient

if (env.NODE_ENV === 'production' && !process.versions.bun) {
  prisma = new PrismaClient({
    log: ['info', 'warn', 'error'],
  })
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['info', 'warn', 'error'],
    })
  }
  prisma = global.prisma
}

export default prisma
