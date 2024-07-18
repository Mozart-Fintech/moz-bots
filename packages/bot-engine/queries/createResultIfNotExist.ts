import prisma from '@mozbot.io/lib/prisma'
import { MozbotInSession } from '@mozbot.io/schemas'

type Props = {
  resultId: string
  mozbot: MozbotInSession
  hasStarted: boolean
  isCompleted: boolean
}

export const createResultIfNotExist = async ({
  resultId,
  mozbot,
  hasStarted,
  isCompleted,
}: Props) => {
  const existingResult = await prisma.result.findUnique({
    where: { id: resultId },
    select: { id: true },
  })
  if (existingResult) return
  return prisma.result.createMany({
    data: [
      {
        id: resultId,
        mozbotId: mozbot.id,
        isCompleted: isCompleted ? true : false,
        hasStarted,
        variables: mozbot.variables,
      },
    ],
  })
}
