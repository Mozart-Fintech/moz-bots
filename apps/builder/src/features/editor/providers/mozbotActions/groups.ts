import { createId } from '@paralleldrive/cuid2'
import { Draft, produce } from 'immer'
import {
  BlockIndices,
  BlockV6,
  BlockWithItems,
  Edge,
  GroupV6,
  MozbotV6,
  Variable,
} from '@mozbot.io/schemas'
import { SetMozbot } from '../MozbotProvider'
import {
  deleteGroupDraft,
  createBlockDraft,
  duplicateBlockDraft,
} from './blocks'
import { byId, isEmpty } from '@mozbot.io/lib'
import { blockHasItems, blockHasOptions } from '@mozbot.io/schemas/helpers'
import { Coordinates, CoordinatesMap } from '@/features/graph/types'
import { parseUniqueKey } from '@mozbot.io/lib/parseUniqueKey'
import { extractVariableIdsFromObject } from '@mozbot.io/variables/extractVariablesFromObject'

export type GroupsActions = {
  createGroup: (
    props: Coordinates & {
      id: string
      block: BlockV6 | BlockV6['type']
      indices: BlockIndices
    }
  ) => string | void
  updateGroup: (
    groupIndex: number,
    updates: Partial<Omit<GroupV6, 'id'>>
  ) => void
  pasteGroups: (
    groups: GroupV6[],
    edges: Edge[],
    variables: Pick<Variable, 'id' | 'name'>[],
    oldToNewIdsMapping: Map<string, string>
  ) => void
  updateGroupsCoordinates: (newCoord: CoordinatesMap) => void
  duplicateGroup: (groupIndex: number) => void
  deleteGroup: (groupIndex: number) => void
  deleteGroups: (groupIds: string[]) => void
}

const groupsActions = (setMozbot: SetMozbot): GroupsActions => ({
  createGroup: ({
    id,
    block,
    indices,
    groupLabel,
    ...graphCoordinates
  }: Coordinates & {
    id: string
    groupLabel?: string
    block: BlockV6 | BlockV6['type']
    indices: BlockIndices
  }) => {
    let newBlockId
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        const newGroup: GroupV6 = {
          id,
          graphCoordinates,
          title: `${groupLabel ?? 'Group'} #${mozbot.groups.length + 1}`,
          blocks: [],
        }
        mozbot.groups.push(newGroup)
        newBlockId = createBlockDraft(mozbot, block, indices)
      })
    )
    return newBlockId
  },
  updateGroup: (groupIndex: number, updates: Partial<Omit<GroupV6, 'id'>>) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        const block = mozbot.groups[groupIndex]
        mozbot.groups[groupIndex] = { ...block, ...updates }
      })
    ),
  updateGroupsCoordinates: (newCoord: CoordinatesMap) => {
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        mozbot.groups.forEach((group) => {
          if (newCoord[group.id]) {
            group.graphCoordinates = newCoord[group.id]
          }
        })
      })
    )
  },
  duplicateGroup: (groupIndex: number) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        const group = mozbot.groups[groupIndex]
        const id = createId()

        const groupTitle = isEmpty(group.title)
          ? ''
          : parseUniqueKey(
              group.title,
              mozbot.groups.map((g) => g.title)
            )

        const newGroup: GroupV6 = {
          ...group,
          title: groupTitle,
          id,
          blocks: group.blocks.map(duplicateBlockDraft),
          graphCoordinates: {
            x: group.graphCoordinates.x + 200,
            y: group.graphCoordinates.y + 100,
          },
        }
        mozbot.groups.splice(groupIndex + 1, 0, newGroup)
      })
    ),
  deleteGroup: (groupIndex: number) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        deleteGroupDraft(mozbot)(groupIndex)
      })
    ),
  deleteGroups: (groupIds: string[]) =>
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        groupIds.forEach((groupId) => {
          deleteGroupByIdDraft(mozbot)(groupId)
        })
      })
    ),
  pasteGroups: (
    groups: GroupV6[],
    edges: Edge[],
    variables: Omit<Variable, 'value'>[],
    oldToNewIdsMapping: Map<string, string>
  ) => {
    const createdGroups: GroupV6[] = []
    setMozbot((mozbot) =>
      produce(mozbot, (mozbot) => {
        const edgesToCreate: Edge[] = []
        const variablesToCreate: Omit<Variable, 'value'>[] = []
        variables.forEach((variable) => {
          const existingVariable = mozbot.variables.find(
            (v) => v.name === variable.name
          )
          if (existingVariable) {
            oldToNewIdsMapping.set(variable.id, existingVariable.id)
            return
          }
          const id = createId()
          oldToNewIdsMapping.set(variable.id, id)
          variablesToCreate.push({
            ...variable,
            id,
          })
        })
        groups.forEach((group) => {
          const groupTitle = isEmpty(group.title)
            ? ''
            : parseUniqueKey(
                group.title,
                mozbot.groups.map((g) => g.title)
              )
          const newGroup: GroupV6 = {
            ...group,
            title: groupTitle,
            blocks: group.blocks.map((block) => {
              const newBlock = { ...block }
              const blockId = createId()
              oldToNewIdsMapping.set(newBlock.id, blockId)
              if (blockHasOptions(newBlock) && newBlock.options) {
                const variableIdsToReplace = extractVariableIdsFromObject(
                  newBlock.options
                ).filter((v) => oldToNewIdsMapping.has(v))
                if (variableIdsToReplace.length > 0) {
                  let optionsStr = JSON.stringify(newBlock.options)
                  variableIdsToReplace.forEach((variableId) => {
                    const newId = oldToNewIdsMapping.get(variableId)
                    if (!newId) return
                    optionsStr = optionsStr.replace(variableId, newId)
                  })
                  newBlock.options = JSON.parse(optionsStr)
                }
              }
              if (blockHasItems(newBlock)) {
                newBlock.items = newBlock.items?.map((item) => {
                  const id = createId()
                  let outgoingEdgeId = item.outgoingEdgeId
                  if (outgoingEdgeId) {
                    const edge = edges.find(byId(outgoingEdgeId))
                    if (edge) {
                      outgoingEdgeId = createId()
                      edgesToCreate.push({
                        ...edge,
                        id: outgoingEdgeId,
                      })
                      oldToNewIdsMapping.set(item.id, id)
                    } else {
                      outgoingEdgeId = undefined
                    }
                  }
                  return {
                    ...item,
                    blockId,
                    id,
                    outgoingEdgeId,
                  }
                }) as BlockWithItems['items']
              }
              let outgoingEdgeId = newBlock.outgoingEdgeId
              if (outgoingEdgeId) {
                const edge = edges.find(byId(outgoingEdgeId))
                if (edge) {
                  outgoingEdgeId = createId()
                  edgesToCreate.push({
                    ...edge,
                    id: outgoingEdgeId,
                  })
                } else {
                  outgoingEdgeId = undefined
                }
              }
              return {
                ...newBlock,
                id: blockId,
                outgoingEdgeId,
              }
            }),
          }
          mozbot.groups.push(newGroup)
          createdGroups.push(newGroup)
        })

        edgesToCreate.forEach((edge) => {
          if (!('blockId' in edge.from)) return
          const fromBlockId = oldToNewIdsMapping.get(edge.from.blockId)
          const toGroupId = oldToNewIdsMapping.get(edge.to.groupId)
          if (!fromBlockId || !toGroupId) return
          const newEdge: Edge = {
            ...edge,
            from: {
              ...edge.from,
              blockId: fromBlockId,
              itemId: edge.from.itemId
                ? oldToNewIdsMapping.get(edge.from.itemId)
                : undefined,
            },
            to: {
              ...edge.to,
              groupId: toGroupId,
              blockId: edge.to.blockId
                ? oldToNewIdsMapping.get(edge.to.blockId)
                : undefined,
            },
          }
          mozbot.edges.push(newEdge)
        })

        variablesToCreate.forEach((variableToCreate) => {
          mozbot.variables.unshift(variableToCreate)
        })
      })
    )
  },
})

const deleteGroupByIdDraft = (mozbot: Draft<MozbotV6>) => (groupId: string) => {
  const groupIndex = mozbot.groups.findIndex(byId(groupId))
  if (groupIndex === -1) return
  deleteGroupDraft(mozbot)(groupIndex)
}

export { groupsActions }
