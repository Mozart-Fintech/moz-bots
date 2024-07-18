import { useTranslate } from '@tolgee/react'
import { Stack, Text } from '@chakra-ui/react'
import { EmbedBubbleBlock } from '@mozbot.io/schemas'
import { SetVariableLabel } from '@/components/SetVariableLabel'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'

type Props = {
  block: EmbedBubbleBlock
}

export const EmbedBubbleContent = ({ block }: Props) => {
  const { mozbot } = useMozbot()
  const { t } = useTranslate()
  if (!block.content?.url)
    return <Text color="gray.500">{t('clickToEdit')}</Text>
  return (
    <Stack>
      <Text>{t('editor.blocks.bubbles.embed.node.show.text')}</Text>
      {mozbot &&
        block.content.waitForEvent?.isEnabled &&
        block.content.waitForEvent.saveDataInVariableId && (
          <SetVariableLabel
            variables={mozbot.variables}
            variableId={block.content.waitForEvent.saveDataInVariableId}
          />
        )}
    </Stack>
  )
}
