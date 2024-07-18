import prisma from '@mozbot.io/lib/prisma'
import { Prisma } from '@mozbot.io/prisma'
import { SessionState } from '@mozbot.io/schemas'

type Props = {
  id: string
  state: SessionState
  isReplying: boolean | undefined
}

export const updateSession = ({
  id,
  state,
  isReplying,
}: Props): Prisma.PrismaPromise<any> =>
  prisma.chatSession.updateMany({
    where: { id },
    data: {
      state,
      isReplying,
    },
  })
