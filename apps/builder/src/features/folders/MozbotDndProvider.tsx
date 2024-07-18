import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react'
import { MozbotInDashboard } from '../dashboard/types'

const mozbotDndContext = createContext<{
  draggedMozbot?: MozbotInDashboard
  setDraggedMozbot: Dispatch<SetStateAction<MozbotInDashboard | undefined>>
  mouseOverFolderId?: string | null
  setMouseOverFolderId: Dispatch<SetStateAction<string | undefined | null>>
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
}>({})

export const MozbotDndProvider = ({ children }: { children: ReactNode }) => {
  const [draggedMozbot, setDraggedMozbot] = useState<MozbotInDashboard>()
  const [mouseOverFolderId, setMouseOverFolderId] = useState<string | null>()

  useEffect(() => {
    draggedMozbot
      ? document.body.classList.add('grabbing')
      : document.body.classList.remove('grabbing')
  }, [draggedMozbot])

  return (
    <mozbotDndContext.Provider
      value={{
        draggedMozbot,
        setDraggedMozbot,
        mouseOverFolderId,
        setMouseOverFolderId,
      }}
    >
      {children}
    </mozbotDndContext.Provider>
  )
}

export const useMozbotDnd = () => useContext(mozbotDndContext)
