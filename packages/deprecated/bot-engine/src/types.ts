import { Log } from '@mozbot.io/prisma'
import {
  Edge,
  Group,
  PublicMozbot,
  ResultValuesInput,
  Mozbot,
  Variable,
  VariableWithUnknowValue,
} from '@mozbot.io/schemas'
import { MozbotViewerProps } from './components/MozbotViewer'
import { LinkedMozbot } from './providers/MozbotProvider'

export type InputSubmitContent = {
  label?: string
  value: string
  itemId?: string
}

export type EdgeId = string

export type LogicState = {
  isPreview: boolean
  apiHost: string
  mozbot: MozbotViewerProps['mozbot']
  linkedMozbots: LinkedMozbot[]
  currentmozbotId: string
  pushParentmozbotId: (id: string) => void
  pushEdgeIdInLinkedMozbotQueue: (bot: {
    edgeId: string
    mozbotId: string
  }) => void
  setCurrentmozbotId: (id: string) => void
  updateVariableValue: (variableId: string, value: unknown) => void
  updateVariables: (variables: VariableWithUnknowValue[]) => void
  injectLinkedMozbot: (mozbot: Mozbot | PublicMozbot) => LinkedMozbot
  onNewLog: (log: Omit<Log, 'id' | 'createdAt' | 'resultId'>) => void
  createEdge: (edge: Edge) => void
}

export type IntegrationState = {
  apiHost: string
  mozbotId: string
  groupId: string
  blockId: string
  isPreview: boolean
  variables: Variable[]
  resultValues: ResultValuesInput
  groups: Group[]
  resultId?: string
  parentmozbotIds: string[]
  updateVariables: (variables: VariableWithUnknowValue[]) => void
  updateVariableValue: (variableId: string, value: unknown) => void
  onNewLog: (log: Omit<Log, 'id' | 'createdAt' | 'resultId'>) => void
}
