import { BlockIndices, ChoiceInputBlock } from '@mozbot.io/schemas'
import React from 'react'
import { Stack, Tag, Text, Wrap } from '@chakra-ui/react'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { SetVariableLabel } from '@/components/SetVariableLabel'
import { ItemNodesList } from '@/features/graph/components/nodes/item/ItemNodesList'
import { useTranslate } from '@tolgee/react'

type Props = {
  block: ChoiceInputBlock
  indices: BlockIndices
}

export const ButtonsBlockNode = ({ block, indices }: Props) => {
  const { mozbot } = useMozbot()
  const { t } = useTranslate()
  const dynamicVariableName = mozbot?.variables.find(
    (variable) => variable.id === block.options?.dynamicVariableId
  )?.name

  return (
    <Stack w="full">
      {block.options?.dynamicVariableId ? (
        <Wrap spacing={1}>
          <Text>{t('blocks.inputs.button.variables.display.label')}</Text>
          <Tag bg="orange.400" color="white">
            {dynamicVariableName}
          </Tag>
          <Text>{t('blocks.inputs.button.variables.buttons.label')}</Text>
        </Wrap>
      ) : (
        <ItemNodesList block={block} indices={indices} />
      )}
      {block.options?.variableId ? (
        <SetVariableLabel
          variableId={block.options.variableId}
          variables={mozbot?.variables}
        />
      ) : null}
    </Stack>
  )
}
