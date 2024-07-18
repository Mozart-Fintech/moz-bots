import prisma from '@mozbot.io/lib/prisma'
import { VisitedEdge } from '@mozbot.io/prisma'

export const saveVisitedEdges = (visitedEdges: VisitedEdge[]) =>
  prisma.visitedEdge.createMany({
    data: visitedEdges,
    skipDuplicates: true,
  })
