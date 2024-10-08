import {
  ReactNode,
  useState,
  useEffect,
  useContext,
  createContext,
  useCallback,
} from 'react'
import { Coordinates, CoordinatesMap } from '../types'
import { MozbotV6 } from '@mozbot.io/schemas'

const eventsCoordinatesContext = createContext<{
  eventsCoordinates: CoordinatesMap
  updateEventCoordinates: (groupId: string, newCoord: Coordinates) => void
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
}>({})

export const EventsCoordinatesProvider = ({
  children,
  events,
}: {
  children: ReactNode
  events: MozbotV6['events'][number][]
  isReadOnly?: boolean
}) => {
  const [eventsCoordinates, setEventsCoordinates] = useState<CoordinatesMap>({})

  useEffect(() => {
    setEventsCoordinates(
      events.reduce(
        (coords, group) => ({
          ...coords,
          [group.id]: group.graphCoordinates,
        }),
        {}
      )
    )
  }, [events])

  const updateEventCoordinates = useCallback(
    (groupId: string, newCoord: Coordinates) =>
      setEventsCoordinates((eventsCoordinates) => ({
        ...eventsCoordinates,
        [groupId]: newCoord,
      })),
    []
  )

  return (
    <eventsCoordinatesContext.Provider
      value={{ eventsCoordinates, updateEventCoordinates }}
    >
      {children}
    </eventsCoordinatesContext.Provider>
  )
}

export const useEventsCoordinates = () => useContext(eventsCoordinatesContext)
