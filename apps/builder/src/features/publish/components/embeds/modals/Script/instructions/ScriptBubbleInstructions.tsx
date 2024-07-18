import { CodeEditor } from '@/components/inputs/CodeEditor'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { Stack, Text } from '@chakra-ui/react'
import { BubbleProps } from '@mozbot.io/nextjs'
import { useState } from 'react'
import { BubbleSettings } from '../../../settings/BubbleSettings/BubbleSettings'
import {
  parseInlineScript,
  parseInitBubbleCode,
  mozbotImportCode,
  parseApiHostValue,
} from '../../../snippetParsers'
import { parseDefaultBubbleTheme } from '../../Javascript/instructions/JavascriptBubbleInstructions'

export const ScriptBubbleInstructions = () => {
  const { mozbot } = useMozbot()
  const [theme, setTheme] = useState<BubbleProps['theme']>(
    parseDefaultBubbleTheme(mozbot)
  )
  const [previewMessage, setPreviewMessage] =
    useState<BubbleProps['previewMessage']>()

  const scriptSnippet = parseInlineScript(
    `${mozbotImportCode}

${parseInitBubbleCode({
  mozbot: mozbot?.publicId ?? '',
  apiHost: parseApiHostValue(mozbot?.customDomain),
  theme,
  previewMessage,
})}`
  )

  return (
    <Stack spacing={4}>
      <BubbleSettings
        theme={theme}
        previewMessage={previewMessage}
        defaultPreviewMessageAvatar={mozbot?.theme.chat?.hostAvatar?.url ?? ''}
        onThemeChange={setTheme}
        onPreviewMessageChange={setPreviewMessage}
      />
      <Text>Run this script to initialize the mozbot:</Text>
      <CodeEditor isReadOnly value={scriptSnippet} lang="javascript" />
    </Stack>
  )
}
