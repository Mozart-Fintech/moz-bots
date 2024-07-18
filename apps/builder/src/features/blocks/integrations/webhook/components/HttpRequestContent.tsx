import { Stack, Text } from '@chakra-ui/react'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { HttpRequestBlock } from '@mozbot.io/schemas'
import { SetVariableLabel } from '@/components/SetVariableLabel'

type Props = {
  block: HttpRequestBlock
}

export const WebhookContent = ({ block: { options } }: Props) => {
  const { mozbot } = useMozbot()
  const webhook = options?.webhook

  if (!webhook?.url) return <Text color="gray.500">Configure...</Text>
  return (
    <Stack w="full">
      <Text noOfLines={2} pr="6">
        {webhook.method} {webhook.url}
      </Text>
      {options?.responseVariableMapping
        ?.filter((mapping) => mapping.variableId)
        .map((mapping) => (
          <SetVariableLabel
            key={mapping.variableId}
            variableId={mapping.variableId as string}
            variables={mozbot?.variables}
          />
        ))}
    </Stack>
  )
}
