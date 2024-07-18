import { MozbotViewerProps } from '@/components/MozbotViewer'
import { safeStringify } from '@/features/variables'
import { sendEventToParent } from '@/utils/chat'
import { Log } from '@mozbot.io/prisma'
import { Edge, PublicMozbot, Mozbot, Variable } from '@mozbot.io/schemas'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'
import { isDefined } from '@mozbot.io/lib'

export type LinkedMozbot = Pick<
  PublicMozbot | Mozbot,
  'id' | 'groups' | 'variables' | 'edges'
>

export type LinkedMozbotQueue = {
  mozbotId: string
  edgeId: string
}[]

const mozbotContext = createContext<{
  currentmozbotId: string
  mozbot: MozbotViewerProps['mozbot']
  linkedMozbots: LinkedMozbot[]
  apiHost: string
  isPreview: boolean
  linkedBotQueue: LinkedMozbotQueue
  isLoading: boolean
  parentmozbotIds: string[]
  setCurrentmozbotId: (id: string) => void
  updateVariableValue: (variableId: string, value: unknown) => void
  createEdge: (edge: Edge) => void
  injectLinkedMozbot: (mozbot: Mozbot | PublicMozbot) => LinkedMozbot
  pushParentmozbotId: (mozbotId: string) => void
  popEdgeIdFromLinkedMozbotQueue: () => void
  pushEdgeIdInLinkedMozbotQueue: (bot: {
    mozbotId: string
    edgeId: string
  }) => void
  onNewLog: (log: Omit<Log, 'id' | 'createdAt' | 'resultId'>) => void
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
}>({})

export const MozbotProvider = ({
  children,
  mozbot,
  apiHost,
  isPreview,
  isLoading,
  onNewLog,
}: {
  children: ReactNode
  mozbot: MozbotViewerProps['mozbot']
  apiHost: string
  isLoading: boolean
  isPreview: boolean
  onNewLog: (log: Omit<Log, 'id' | 'createdAt' | 'resultId'>) => void
}) => {
  const [localMozbot, setLocalMozbot] =
    useState<MozbotViewerProps['mozbot']>(mozbot)
  const [linkedMozbots, setLinkedMozbots] = useState<LinkedMozbot[]>([])
  const [currentmozbotId, setCurrentmozbotId] = useState(mozbot.mozbotId)
  const [linkedBotQueue, setLinkedBotQueue] = useState<LinkedMozbotQueue>([])
  const [parentmozbotIds, setParentmozbotIds] = useState<string[]>([])

  useEffect(() => {
    setLocalMozbot((localMozbot) => ({
      ...localMozbot,
      theme: mozbot.theme,
      settings: mozbot.settings,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mozbot.theme, mozbot.settings])

  const updateVariableValue = (variableId: string, value: unknown) => {
    const formattedValue = safeStringify(value)

    sendEventToParent({
      newVariableValue: {
        name:
          localMozbot.variables.find((variable) => variable.id === variableId)
            ?.name ?? '',
        value: formattedValue ?? '',
      },
    })

    const variable = localMozbot.variables.find((v) => v.id === variableId)
    const otherVariablesWithSameName = localMozbot.variables.filter(
      (v) => v.name === variable?.name && v.id !== variableId
    )
    const variablesToUpdate = [variable, ...otherVariablesWithSameName].filter(
      isDefined
    )

    setLocalMozbot((mozbot) => ({
      ...mozbot,
      variables: mozbot.variables.map((variable) =>
        variablesToUpdate.some(
          (variableToUpdate) => variableToUpdate.id === variable.id
        )
          ? { ...variable, value: formattedValue }
          : variable
      ),
    }))
  }

  const createEdge = (edge: Edge) => {
    setLocalMozbot((mozbot) => ({
      ...mozbot,
      edges: [...mozbot.edges, edge],
    }))
  }

  const injectLinkedMozbot = (mozbot: Mozbot | PublicMozbot) => {
    const newVariables = fillVariablesWithExistingValues(
      mozbot.variables,
      localMozbot.variables
    )
    const mozbotToInject = {
      id: 'mozbotId' in mozbot ? mozbot.mozbotId : mozbot.id,
      groups: mozbot.groups,
      edges: mozbot.edges,
      variables: newVariables,
    }
    setLinkedMozbots((mozbots) => [...mozbots, mozbotToInject])
    const updatedMozbot = {
      ...localMozbot,
      groups: [...localMozbot.groups, ...mozbotToInject.groups],
      variables: [...localMozbot.variables, ...mozbotToInject.variables],
      edges: [...localMozbot.edges, ...mozbotToInject.edges],
    } as MozbotViewerProps['mozbot']
    setLocalMozbot(updatedMozbot)
    return mozbotToInject
  }

  const fillVariablesWithExistingValues = (
    variables: Variable[],
    variablesWithValues: Variable[]
  ): Variable[] =>
    variables.map((variable) => {
      const matchedVariable = variablesWithValues.find(
        (variableWithValue) => variableWithValue.name === variable.name
      )

      return {
        ...variable,
        value: matchedVariable?.value ?? variable.value,
      }
    })

  const pushParentmozbotId = (mozbotId: string) => {
    setParentmozbotIds((ids) => [...ids, mozbotId])
  }

  const pushEdgeIdInLinkedMozbotQueue = (bot: {
    mozbotId: string
    edgeId: string
  }) => setLinkedBotQueue((queue) => [...queue, bot])

  const popEdgeIdFromLinkedMozbotQueue = () => {
    setLinkedBotQueue((queue) => queue.slice(1))
    setParentmozbotIds((ids) => ids.slice(1))
    setCurrentmozbotId(linkedBotQueue[0].mozbotId)
  }

  return (
    <mozbotContext.Provider
      value={{
        mozbot: localMozbot,
        linkedMozbots,
        apiHost,
        isPreview,
        updateVariableValue,
        createEdge,
        injectLinkedMozbot,
        onNewLog,
        linkedBotQueue,
        isLoading,
        parentmozbotIds,
        pushParentmozbotId,
        pushEdgeIdInLinkedMozbotQueue,
        popEdgeIdFromLinkedMozbotQueue,
        currentmozbotId,
        setCurrentmozbotId,
      }}
    >
      {children}
    </mozbotContext.Provider>
  )
}

export const useMozbot = () => useContext(mozbotContext)
