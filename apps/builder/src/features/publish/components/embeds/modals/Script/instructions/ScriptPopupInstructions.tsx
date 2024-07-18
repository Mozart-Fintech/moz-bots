import { CodeEditor } from '@/components/inputs/CodeEditor'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { PopupSettings } from '../../../settings/PopupSettings'
import { parseInitPopupCode } from '../../../snippetParsers'
import {
  parseApiHostValue,
  parseInlineScript,
  mozbotImportCode,
} from '../../../snippetParsers/shared'

export const ScriptPopupInstructions = () => {
  const { mozbot } = useMozbot()
  const [inputValue, setInputValue] = useState<number>()

  const scriptSnippet = parseInlineScript(
    `${mozbotImportCode}

${parseInitPopupCode({
  mozbot: mozbot?.publicId ?? '',
  apiHost: parseApiHostValue(mozbot?.customDomain),
  autoShowDelay: inputValue,
})}`
  )

  return (
    <Stack spacing={4}>
      <PopupSettings
        onUpdateSettings={(settings) => setInputValue(settings.autoShowDelay)}
      />
      <Text>Run this script to initialize the mozbot:</Text>
      <CodeEditor isReadOnly value={scriptSnippet} lang="javascript" />
    </Stack>
  )
}
