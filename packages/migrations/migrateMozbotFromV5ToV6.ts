import {
  BlockV5,
  BlockV6,
  GoogleSheetsBlockV5,
  GoogleSheetsBlockV6,
  PublicMozbotV5,
  PublicMozbotV6,
  MozbotV5,
  MozbotV6,
} from '@mozbot.io/schemas'
import { IntegrationBlockType } from '@mozbot.io/schemas/features/blocks/integrations/constants'
import { GoogleSheetsAction } from '@mozbot.io/schemas/features/blocks/integrations/googleSheets/constants'
import { ComparisonOperators } from '@mozbot.io/schemas/features/blocks/logic/condition/constants'
import { createId } from '@mozbot.io/lib/createId'
import { EventType } from '@mozbot.io/schemas/features/events/constants'
import { byId } from '@mozbot.io/lib/utils'

export const migrateMozbotFromV5ToV6 = async (
  mozbot: MozbotV5 | PublicMozbotV5
): Promise<MozbotV6 | PublicMozbotV6> => {
  const startGroup = mozbot.groups.find((group) =>
    group.blocks.some((b) => b.type === 'start')
  )

  if (!startGroup) throw new Error('Start group not found')

  const startBlock = startGroup?.blocks.find((b) => b.type === 'start')

  if (!startBlock) throw new Error('Start block not found')

  const startOutgoingEdge = mozbot.edges.find(byId(startBlock.outgoingEdgeId))

  return {
    ...mozbot,
    groups: migrateGroups(
      mozbot.groups.filter((g) => g.blocks.some((b) => b.type !== 'start'))
    ),
    version: '6',
    events: [
      {
        id: startGroup.id,
        type: EventType.START,
        graphCoordinates: startGroup.graphCoordinates,
        outgoingEdgeId: startBlock.outgoingEdgeId,
      },
    ],
    edges: startOutgoingEdge
      ? [
          {
            ...startOutgoingEdge,
            from: {
              eventId: startGroup.id,
            },
          },
          ...mozbot.edges.filter((e) => e.id !== startOutgoingEdge.id),
        ]
      : mozbot.edges,
  }
}

const migrateGroups = (groups: MozbotV5['groups']): MozbotV6['groups'] =>
  groups.map((group) => ({
    ...group,
    blocks: migrateBlocksFromV1ToV2(group.blocks),
  }))

const migrateBlocksFromV1ToV2 = (
  blocks: MozbotV5['groups'][0]['blocks']
): BlockV6[] =>
  (
    blocks.filter((block) => block.type !== 'start') as Exclude<
      BlockV5,
      { type: 'start' }
    >[]
  ).map((block) => {
    if (block.type === IntegrationBlockType.GOOGLE_SHEETS) {
      return {
        ...block,
        options: migrateGoogleSheetsOptions(block.options),
      }
    }
    return block
  })

const migrateGoogleSheetsOptions = (
  options: GoogleSheetsBlockV5['options']
): GoogleSheetsBlockV6['options'] => {
  if (!options) return
  if (options.action === GoogleSheetsAction.GET) {
    if (options.filter || !options.referenceCell) return options
    return {
      ...options,
      filter: {
        comparisons: [
          {
            id: createId(),
            column: options.referenceCell?.column,
            comparisonOperator: ComparisonOperators.EQUAL,
            value: options.referenceCell?.value,
          },
        ],
      },
    }
  }
  if (options.action === GoogleSheetsAction.INSERT_ROW) {
    return options
  }
  if (options.action === GoogleSheetsAction.UPDATE_ROW) {
    if (options.filter || !options.referenceCell) return options
    return {
      ...options,
      filter: {
        comparisons: [
          {
            id: createId(),
            column: options.referenceCell?.column,
            comparisonOperator: ComparisonOperators.EQUAL,
            value: options.referenceCell?.value,
          },
        ],
      },
    }
  }
  return options
}
