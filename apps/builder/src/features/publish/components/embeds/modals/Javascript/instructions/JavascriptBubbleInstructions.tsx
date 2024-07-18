import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { Stack, Code, Text } from '@chakra-ui/react'
import { BubbleProps } from '@mozbot.io/nextjs'
import { Mozbot } from '@mozbot.io/schemas'
import { useState } from 'react'
import { BubbleSettings } from '../../../settings/BubbleSettings/BubbleSettings'
import { JavascriptBubbleSnippet } from '../JavascriptBubbleSnippet'
import { defaultButtonsBackgroundColor } from '@mozbot.io/schemas/features/mozbot/theme/constants'

export const parseDefaultBubbleTheme = (mozbot?: Mozbot) => ({
  button: {
    backgroundColor:
      mozbot?.theme.chat?.buttons?.backgroundColor ??
      defaultButtonsBackgroundColor,
  },
})

export const JavascriptBubbleInstructions = () => {
  const { mozbot } = useMozbot()
  const [theme, setTheme] = useState<BubbleProps['theme']>(
    parseDefaultBubbleTheme(mozbot)
  )
  const [previewMessage, setPreviewMessage] =
    useState<BubbleProps['previewMessage']>()

  return (
    <Stack spacing={4}>
      <BubbleSettings
        theme={theme}
        previewMessage={previewMessage}
        defaultPreviewMessageAvatar={mozbot?.theme.chat?.hostAvatar?.url ?? ''}
        onThemeChange={setTheme}
        onPreviewMessageChange={setPreviewMessage}
      />
      <Text>
        Paste this anywhere in the <Code>{'<body>'}</Code>:
      </Text>
      <JavascriptBubbleSnippet theme={theme} previewMessage={previewMessage} />
    </Stack>
  )
}
