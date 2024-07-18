import { Mozbot, Variable } from '@mozbot.io/schemas'
import { SetMozbot } from '../MozbotProvider'
import { Draft, produce } from 'immer'

export type VariablesActions = {
  createVariable: (variable: Variable) => void
  updateVariable: (
    variableId: string,
    updates: Partial<Omit<Variable, 'id'>>
  ) => void
  deleteVariable: (variableId: string) => void
}

export const variablesAction = (setMozbot: SetMozbot): VariablesActions => ({
  createVariable: (newVariable: Variable) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        mozbot.variables.unshift(newVariable)
      })
    ),
  updateVariable: (
    variableId: string,
    updates: Partial<Omit<Variable, 'id'>>
  ) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        mozbot.variables = mozbot.variables.map((v) =>
          v.id === variableId ? { ...v, ...updates } : v
        )
      })
    ),
  deleteVariable: (itemId: string) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        deleteVariableDraft(mozbot, itemId)
      })
    ),
})

export const deleteVariableDraft = (
  mozbot: Draft<Mozbot>,
  variableId: string
) => {
  const index = mozbot.variables.findIndex((v) => v.id === variableId)
  mozbot.variables.splice(index, 1)
}
