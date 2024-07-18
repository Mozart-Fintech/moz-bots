import { produce } from 'immer'
import { TEvent } from '@mozbot.io/schemas'
import { SetMozbot } from '../MozbotProvider'

export type EventsActions = {
  updateEvent: (
    eventIndex: number,
    updates: Partial<Omit<TEvent, 'id'>>
  ) => void
}

const eventsActions = (setMozbot: SetMozbot): EventsActions => ({
  updateEvent: (eventIndex: number, updates: Partial<Omit<TEvent, 'id'>>) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        const event = mozbot.events[eventIndex]
        mozbot.events[eventIndex] = { ...event, ...updates }
      })
    ),
})

export { eventsActions }
