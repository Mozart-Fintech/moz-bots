import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { OrderedList, ListItem, Code, Stack, Text } from '@chakra-ui/react'
import { BubbleProps } from '@mozbot.io/nextjs'
import { useState } from 'react'
import { BubbleSettings } from '../../../settings/BubbleSettings/BubbleSettings'
import { parseDefaultBubbleTheme } from '../../Javascript/instructions/JavascriptBubbleInstructions'
import { JavascriptBubbleSnippet } from '../../Javascript/JavascriptBubbleSnippet'
import { TextLink } from '@/components/TextLink'

export const FramerBubbleInstructions = () => {
  const { mozbot } = useMozbot()

  const [theme, setTheme] = useState<BubbleProps['theme']>(
    parseDefaultBubbleTheme(mozbot)
  )
  const [previewMessage, setPreviewMessage] =
    useState<BubbleProps['previewMessage']>()

  return (
    <>
      <OrderedList spacing={4} pl={5}>
        <ListItem>
          Head over to the <Code>Site Settings</Code> {'>'} <Code>General</Code>{' '}
          {'>'} <Code>Custom Code</Code> section
        </ListItem>
        <ListItem>
          <Stack spacing={4}>
            <BubbleSettings
              previewMessage={previewMessage}
              defaultPreviewMessageAvatar={
                mozbot?.theme.chat?.hostAvatar?.url ?? ''
              }
              theme={theme}
              onPreviewMessageChange={setPreviewMessage}
              onThemeChange={setTheme}
            />
            <Text>
              Paste this in the{' '}
              <Code>
                End of {'<'}body{'>'} tag
              </Code>{' '}
              input:
            </Text>
            <JavascriptBubbleSnippet
              theme={theme}
              previewMessage={previewMessage}
            />
          </Stack>
        </ListItem>
      </OrderedList>
      <Text fontSize="sm" colorScheme="gray" pl="5">
        Check out the{' '}
        <TextLink
          href="https://www.framer.com/academy/lessons/custom-code"
          isExternal
        >
          Custom Code Framer doc
        </TextLink>{' '}
        for more information.
      </Text>
    </>
  )
}
