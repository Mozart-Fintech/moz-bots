import prisma from '@mozbot.io/lib/prisma'

export const getCredentials = async (credentialsId: string) =>
  prisma.credentials.findUnique({
    where: { id: credentialsId },
  })
