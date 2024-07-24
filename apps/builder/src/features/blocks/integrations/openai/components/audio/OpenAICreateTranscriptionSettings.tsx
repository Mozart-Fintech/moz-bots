import { CreateTranscriptionOpenAIOptions } from '@mozbot.io/schemas/features/blocks/integrations/openai'
import { FormControl, FormLabel, Stack, Text } from '@chakra-ui/react'
import { TextLink } from '@/components/TextLink'
import { ModelsDropdown } from '../ModelsDropdown'
import { VariableSearchInput } from '@/components/inputs/VariableSearchInput'
import { Variable } from '@mozbot.io/schemas'

const apiReferenceUrl =
  'https://platform.openai.com/docs/api-reference/audio/createTranscription'

type Props = {
  options: CreateTranscriptionOpenAIOptions
  onOptionsChange: (options: CreateTranscriptionOpenAIOptions) => void
}

export const OpenAICreateTranscriptionSettings = ({
  options,
  onOptionsChange,
}: Props) => {
  const updateModel = (model: string | undefined) => {
    onOptionsChange({
      ...options,
      model,
    })
  }

  const updateURL = (variable: Pick<Variable, 'id' | 'name'> | undefined) => {
    onOptionsChange({
      ...options,
      url: variable?.id,
    })
  }

  const updateSaveTextInVariableId = (
    variable: Pick<Variable, 'id' | 'name'> | undefined
  ) => {
    onOptionsChange({
      ...options,
      saveTextInVariableId: variable?.id,
    })
  }

  return (
    <Stack spacing={4} pt="2">
      <Text fontSize="sm" color="gray.500">
        Read the{' '}
        <TextLink href={apiReferenceUrl} isExternal>
          API reference
        </TextLink>{' '}
        to better understand the available options.
      </Text>
      {options.credentialsId && (
        <>
          <ModelsDropdown
            credentialsId={options.credentialsId}
            defaultValue={options.model}
            baseUrl={options.baseUrl}
            apiVersion={options.apiVersion}
            type="whisper"
            onChange={updateModel}
          />
          <FormControl>
            <FormLabel>Url:</FormLabel>
            <VariableSearchInput
              initialVariableId={options.url}
              onSelectVariable={updateURL}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Save Text:</FormLabel>
            <VariableSearchInput
              initialVariableId={options.saveTextInVariableId}
              onSelectVariable={updateSaveTextInVariableId}
            />
          </FormControl>
        </>
      )}
    </Stack>
  )
}
