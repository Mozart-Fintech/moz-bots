import { useMemo } from 'react'
import { forgedBlocks } from '@mozbot.io/forge-repository/definitions'
import { forgedBlockSchemas } from '@mozbot.io/forge-repository/schemas'
import { BlockV6 } from '@mozbot.io/schemas'
import { isForgedBlockType } from '@mozbot.io/schemas/features/blocks/forged/helpers'

export const useForgedBlock = (blockType: BlockV6['type'], action?: string) =>
  useMemo(() => {
    if (!isForgedBlockType(blockType)) return {}
    const blockDef = forgedBlocks[blockType]
    return {
      blockDef,
      blockSchema: forgedBlockSchemas[blockType],
      actionDef: action
        ? blockDef?.actions.find((a) => a.name === action)
        : undefined,
    }
  }, [action, blockType])
