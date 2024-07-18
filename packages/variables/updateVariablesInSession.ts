import { safeStringify } from '@mozbot.io/lib/safeStringify'
import { Variable, VariableWithUnknowValue } from './types'
import { SessionState, SetVariableHistoryItem } from '../schemas'

type Props = {
  state: SessionState
  newVariables: VariableWithUnknowValue[]
  currentBlockId: string | undefined
}
export const updateVariablesInSession = ({
  state,
  newVariables,
  currentBlockId,
}: Props): {
  updatedState: SessionState
  newSetVariableHistory: SetVariableHistoryItem[]
} => {
  const { updatedVariables, newSetVariableHistory, setVariableHistoryIndex } =
    updateMozbotVariables({
      state,
      newVariables,
      currentBlockId,
    })

  return {
    updatedState: {
      ...state,
      currentSetVariableHistoryIndex: setVariableHistoryIndex,
      mozbotsQueue: state.mozbotsQueue.map((mozbotInQueue, index: number) =>
        index === 0
          ? {
              ...mozbotInQueue,
              mozbot: {
                ...mozbotInQueue.mozbot,
                variables: updatedVariables,
              },
            }
          : mozbotInQueue
      ),
      previewMetadata: state.mozbotsQueue[0].resultId
        ? state.previewMetadata
        : {
            ...state.previewMetadata,
            setVariableHistory: (
              state.previewMetadata?.setVariableHistory ?? []
            ).concat(newSetVariableHistory),
          },
    },
    newSetVariableHistory,
  }
}

const updateMozbotVariables = ({
  state,
  newVariables,
  currentBlockId,
}: {
  state: SessionState
  newVariables: VariableWithUnknowValue[]
  currentBlockId: string | undefined
}): {
  updatedVariables: Variable[]
  newSetVariableHistory: SetVariableHistoryItem[]
  setVariableHistoryIndex: number
} => {
  const serializedNewVariables = newVariables.map((variable) => ({
    ...variable,
    value: Array.isArray(variable.value)
      ? variable.value.map(safeStringify)
      : safeStringify(variable.value),
  }))

  let setVariableHistoryIndex = state.currentSetVariableHistoryIndex ?? 0
  const setVariableHistory: SetVariableHistoryItem[] = []
  if (currentBlockId) {
    serializedNewVariables
      .filter((v) => state.setVariableIdsForHistory?.includes(v.id))
      .forEach((newVariable) => {
        setVariableHistory.push({
          resultId: state.mozbotsQueue[0].resultId as string,
          index: setVariableHistoryIndex,
          blockId: currentBlockId,
          variableId: newVariable.id,
          value: newVariable.value,
        })
        setVariableHistoryIndex += 1
      })
  }

  return {
    updatedVariables: [
      ...state.mozbotsQueue[0].mozbot.variables.filter((existingVariable) =>
        serializedNewVariables.every(
          (newVariable) => existingVariable.id !== newVariable.id
        )
      ),
      ...serializedNewVariables,
    ],
    newSetVariableHistory: setVariableHistory,
    setVariableHistoryIndex,
  }
}
