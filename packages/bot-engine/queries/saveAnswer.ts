import prisma from '@mozbot.io/lib/prisma'
import { Prisma } from '@mozbot.io/prisma'
import { SessionState } from '@mozbot.io/schemas'

type Props = {
  answer: Omit<Prisma.AnswerV2CreateManyInput, 'resultId'>
  state: SessionState
}
export const saveAnswer = async ({ answer, state }: Props) => {
  const resultId = state.mozbotsQueue[0].resultId
  if (!resultId) return
  return prisma.answerV2.createMany({
    data: [{ ...answer, resultId }],
  })
}
