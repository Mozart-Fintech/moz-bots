import {
  BlockV5,
  BlockV6,
  PublicMozbot,
  Mozbot,
  MozbotV6,
} from '@mozbot.io/schemas'
import { isDefined } from '@mozbot.io/lib/utils'
import { createId } from '@mozbot.io/lib/createId'
import { proWorkspaceId } from './databaseSetup'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'
import { EventType } from '@mozbot.io/schemas/features/events/constants'

export const parseTestMozbot = (partialMozbot: Partial<Mozbot>): Mozbot => {
  const version = partialMozbot.version ?? ('3' as any)

  return {
    id: createId(),
    version,
    workspaceId: proWorkspaceId,
    folderId: null,
    name: 'My mozbot',
    theme: {},
    settings: {},
    publicId: null,
    updatedAt: new Date(),
    createdAt: new Date(),
    customDomain: null,
    icon: null,
    selectedThemeTemplateId: null,
    isArchived: false,
    isClosed: false,
    resultsTablePreferences: null,
    whatsAppCredentialsId: null,
    riskLevel: null,
    events:
      version === '6'
        ? [
            {
              id: 'group1',
              type: EventType.START,
              graphCoordinates: { x: 0, y: 0 },
              outgoingEdgeId: 'edge1',
            },
          ]
        : null,
    variables: [{ id: 'var1', name: 'var1' }],
    ...partialMozbot,
    edges: [
      {
        id: 'edge1',
        from: { blockId: 'block0' },
        to: { groupId: 'group1' },
      },
    ],
    groups: (version === '6'
      ? partialMozbot.groups ?? []
      : [
          {
            id: 'group0',
            title: 'Group #0',
            blocks: [
              {
                id: 'block0',
                type: 'start',
                label: 'Start',
                outgoingEdgeId: 'edge1',
              },
            ],
            graphCoordinates: { x: 0, y: 0 },
          },
          ...(partialMozbot.groups ?? []),
        ]) as any[],
  }
}

export const parseMozbotToPublicMozbot = (
  id: string,
  mozbot: Mozbot
): Omit<PublicMozbot, 'createdAt' | 'updatedAt'> => ({
  id,
  version: mozbot.version,
  groups: mozbot.groups,
  mozbotId: mozbot.id,
  theme: mozbot.theme,
  settings: mozbot.settings,
  variables: mozbot.variables,
  edges: mozbot.edges,
  events: mozbot.events,
})

type Options = {
  withGoButton?: boolean
}

export const parseDefaultGroupWithBlock = (
  block: Partial<BlockV6>,
  options?: Options
): Pick<MozbotV6, 'groups'> => ({
  groups: [
    {
      graphCoordinates: { x: 200, y: 200 },
      id: 'group1',
      blocks: [
        options?.withGoButton
          ? {
              id: 'block1',
              groupId: 'group1',
              type: InputBlockType.CHOICE,
              items: [
                {
                  id: 'item1',
                  blockId: 'block1',
                  content: 'Go',
                },
              ],
              options: {},
            }
          : undefined,
        {
          id: 'block2',
          ...block,
        } as BlockV5,
      ].filter(isDefined) as BlockV6[],
      title: 'Group #1',
    },
  ],
})
