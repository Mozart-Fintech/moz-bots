import prisma from '@mozbot.io/lib/prisma'
import { Prisma } from '@mozbot.io/prisma'
import { SetVariableHistoryItem } from '@mozbot.io/schemas'

export const saveSetVariableHistoryItems = (
  setVariableHistory: SetVariableHistoryItem[]
) =>
  prisma.setVariableHistoryItem.createMany({
    data: {
      ...setVariableHistory.map((item) => ({
        ...item,
        value: item.value === null ? Prisma.JsonNull : item.value,
      })),
    },
    skipDuplicates: true,
  })
