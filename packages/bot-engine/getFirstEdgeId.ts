import { TRPCError } from '@trpc/server'
import { MozbotInSession } from '@mozbot.io/schemas'

export const getFirstEdgeId = ({
  mozbot,
  startEventId,
}: {
  mozbot: Pick<MozbotInSession, 'events' | 'groups' | 'version'>
  startEventId: string | undefined
}) => {
  if (startEventId) {
    const event = mozbot.events?.find((e) => e.id === startEventId)
    if (!event)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: "Start event doesn't exist",
      })
    return event.outgoingEdgeId
  }
  if (mozbot.version === '6') return mozbot.events?.[0].outgoingEdgeId
  return mozbot.groups.at(0)?.blocks.at(0)?.outgoingEdgeId
}
