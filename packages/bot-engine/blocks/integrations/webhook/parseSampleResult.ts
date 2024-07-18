import {
  InputBlock,
  PublicMozbot,
  ResultHeaderCell,
  Block,
  Mozbot,
  MozbotLinkBlock,
  Variable,
} from '@mozbot.io/schemas'
import { byId, isNotDefined } from '@mozbot.io/lib'
import { isInputBlock } from '@mozbot.io/schemas/helpers'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'
import { LogicBlockType } from '@mozbot.io/schemas/features/blocks/logic/constants'
import { parseResultHeader } from '@mozbot.io/results/parseResultHeader'

export const parseSampleResult =
  (
    mozbot: Pick<Mozbot | PublicMozbot, 'groups' | 'variables' | 'edges'>,
    linkedMozbots: (Mozbot | PublicMozbot)[],
    userEmail?: string
  ) =>
  async (
    currentGroupId: string,
    variables: Variable[]
  ): Promise<Record<string, string | boolean | undefined>> => {
    const header = parseResultHeader(mozbot, linkedMozbots)
    const linkedInputBlocks = await extractLinkedInputBlocks(
      mozbot,
      linkedMozbots
    )(currentGroupId)

    return {
      message: 'This is a sample result, it has been generated ⬇️',
      submittedAt: new Date().toISOString(),
      ...parseResultSample(linkedInputBlocks, header, variables, userEmail),
    }
  }

const extractLinkedInputBlocks =
  (
    mozbot: Pick<Mozbot | PublicMozbot, 'groups' | 'variables' | 'edges'>,
    linkedMozbots: (Mozbot | PublicMozbot)[]
  ) =>
  async (
    currentGroupId?: string,
    direction: 'backward' | 'forward' = 'backward'
  ): Promise<InputBlock[]> => {
    const previousLinkedMozbotBlocks = walkEdgesAndExtract(
      'linkedBot',
      direction,
      mozbot
    )({
      groupId: currentGroupId,
    }) as MozbotLinkBlock[]

    const linkedBotInputs =
      previousLinkedMozbotBlocks.length > 0
        ? await Promise.all(
            previousLinkedMozbotBlocks.map((linkedBot) => {
              const linkedMozbot = linkedMozbots.find((t) =>
                'mozbotId' in t
                  ? t.mozbotId === linkedBot.options?.mozbotId
                  : t.id === linkedBot.options?.mozbotId
              )
              if (!linkedMozbot) return []
              return extractLinkedInputBlocks(linkedMozbot, linkedMozbots)(
                linkedBot.options?.groupId,
                'forward'
              )
            })
          )
        : []

    return (
      walkEdgesAndExtract(
        'input',
        direction,
        mozbot
      )({
        groupId: currentGroupId,
      }) as InputBlock[]
    ).concat(linkedBotInputs.flatMap((l) => l))
  }

const parseResultSample = (
  inputBlocks: InputBlock[],
  headerCells: ResultHeaderCell[],
  variables: Variable[],
  userEmail?: string
) =>
  headerCells.reduce<Record<string, string | (string | null)[] | undefined>>(
    (resultSample, cell) => {
      const inputBlock = inputBlocks.find((inputBlock) =>
        cell.blocks?.some((block) => block.id === inputBlock.id)
      )
      if (isNotDefined(inputBlock)) {
        if (cell.variableIds) {
          const variableValue = variables.find(
            (variable) =>
              cell.variableIds?.includes(variable.id) && variable.value
          )?.value
          return {
            ...resultSample,
            [cell.label]: variableValue ?? 'content',
          }
        }

        return resultSample
      }
      const variableValue = variables.find(
        (variable) => cell.variableIds?.includes(variable.id) && variable.value
      )?.value
      const value = variableValue ?? getSampleValue(inputBlock, userEmail)
      return {
        ...resultSample,
        [cell.label]: value,
      }
    },
    {}
  )

const getSampleValue = (block: InputBlock, userEmail?: string): string => {
  switch (block.type) {
    case InputBlockType.CHOICE:
      return block.options?.isMultipleChoice
        ? block.items.map((item) => item.content).join(', ')
        : block.items[0]?.content ?? 'Item'
    case InputBlockType.DATE:
      return new Date().toUTCString()
    case InputBlockType.EMAIL:
      return userEmail ?? 'test@email.com'
    case InputBlockType.NUMBER:
      return '20'
    case InputBlockType.PHONE:
      return '+33665566773'
    case InputBlockType.TEXT:
      return 'answer value'
    case InputBlockType.URL:
      return 'https://test.com'
    case InputBlockType.FILE:
      return 'https://domain.com/fake-file.png'
    case InputBlockType.RATING:
      return '8'
    case InputBlockType.PAYMENT:
      return 'Success'
    case InputBlockType.PICTURE_CHOICE:
      return block.options?.isMultipleChoice
        ? block.items.map((item) => item.title ?? item.pictureSrc).join(', ')
        : block.items[0]?.title ?? block.items[0]?.pictureSrc ?? 'Item'
  }
}

const walkEdgesAndExtract =
  (
    type: 'input' | 'linkedBot',
    direction: 'backward' | 'forward',
    mozbot: Pick<Mozbot | PublicMozbot, 'groups' | 'variables' | 'edges'>
  ) =>
  ({ groupId }: { groupId?: string }): Block[] => {
    const currentGroupId =
      groupId ??
      (mozbot.groups.find((b) => b.blocks[0].type === 'start')?.id as string)
    const blocksInGroup = extractBlocksInGroup(
      type,
      mozbot
    )({
      groupId: currentGroupId,
    })
    const otherGroupIds = getGroupIdsLinkedToGroup(
      mozbot,
      direction
    )(currentGroupId)
    return blocksInGroup.concat(
      otherGroupIds.flatMap((groupId) =>
        extractBlocksInGroup(type, mozbot)({ groupId })
      )
    )
  }

const getGroupIdsLinkedToGroup =
  (
    mozbot: Pick<Mozbot | PublicMozbot, 'groups' | 'variables' | 'edges'>,
    direction: 'backward' | 'forward',
    visitedGroupIds: string[] = []
  ) =>
  (groupId: string): string[] => {
    const linkedGroupIds = mozbot.edges.reduce<string[]>((groupIds, edge) => {
      const fromGroupId = mozbot.groups.find((g) =>
        g.blocks.some(
          (b) => 'blockId' in edge.from && b.id === edge.from.blockId
        )
      )?.id
      if (!fromGroupId) return groupIds
      if (direction === 'forward') {
        if (
          (!visitedGroupIds || !visitedGroupIds?.includes(edge.to.groupId)) &&
          fromGroupId === groupId
        ) {
          visitedGroupIds.push(edge.to.groupId)
          return groupIds.concat(edge.to.groupId)
        }
        return groupIds
      }
      if (
        !visitedGroupIds.includes(fromGroupId) &&
        edge.to.groupId === groupId
      ) {
        visitedGroupIds.push(fromGroupId)
        return groupIds.concat(fromGroupId)
      }
      return groupIds
    }, [])
    return linkedGroupIds.concat(
      linkedGroupIds.flatMap(
        getGroupIdsLinkedToGroup(mozbot, direction, visitedGroupIds)
      )
    )
  }

const extractBlocksInGroup =
  (
    type: 'input' | 'linkedBot',
    mozbot: Pick<Mozbot | PublicMozbot, 'groups' | 'variables' | 'edges'>
  ) =>
  ({ groupId, blockId }: { groupId: string; blockId?: string }) => {
    const currentGroup = mozbot.groups.find(byId(groupId))
    if (!currentGroup) return []
    const blocks: Block[] = []
    for (const block of currentGroup.blocks) {
      if (block.id === blockId) break
      if (type === 'input' && isInputBlock(block)) blocks.push(block)
      if (type === 'linkedBot' && block.type === LogicBlockType.MOZBOT_LINK)
        blocks.push(block)
    }
    return blocks
  }
