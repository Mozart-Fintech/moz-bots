import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Heading,
  HStack,
  Stack,
} from '@chakra-ui/react'
import { ChatIcon, CodeIcon, DropletIcon, TableIcon } from '@/components/icons'
import { ChatTheme, GeneralTheme, ThemeTemplate } from '@mozbot.io/schemas'
import React from 'react'
import { CustomCssSettings } from './CustomCssSettings'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { ChatThemeSettings } from './chat/ChatThemeSettings'
import { GeneralSettings } from './general/GeneralSettings'
import { ThemeTemplates } from './ThemeTemplates'
import { defaultSettings } from '@mozbot.io/schemas/features/mozbot/settings/constants'
import { useTranslate } from '@tolgee/react'

export const ThemeSideMenu = () => {
  const { t } = useTranslate()

  const { mozbot, updateMozbot, currentUserMode } = useMozbot()

  const updateChatTheme = (chat: ChatTheme) =>
    mozbot && updateMozbot({ updates: { theme: { ...mozbot.theme, chat } } })

  const updateGeneralTheme = (general?: GeneralTheme) =>
    mozbot && updateMozbot({ updates: { theme: { ...mozbot.theme, general } } })

  const updateCustomCss = (customCss: string) =>
    mozbot &&
    updateMozbot({ updates: { theme: { ...mozbot.theme, customCss } } })

  const selectTemplate = (
    selectedTemplate: Partial<Pick<ThemeTemplate, 'id' | 'theme'>>
  ) => {
    if (!mozbot) return
    const { theme, id } = selectedTemplate
    updateMozbot({
      updates: {
        selectedThemeTemplateId: id,
        theme: theme ? { ...theme } : mozbot.theme,
      },
    })
  }

  const updateBranding = (isBrandingEnabled: boolean) =>
    mozbot &&
    updateMozbot({
      updates: {
        settings: { ...mozbot.settings, general: { isBrandingEnabled } },
      },
    })

  const templateId = mozbot?.selectedThemeTemplateId ?? undefined

  return (
    <Stack
      flex="1"
      maxW="400px"
      h="full"
      borderRightWidth={1}
      pt={10}
      spacing={10}
      overflowY="auto"
      pb="20"
      position="relative"
    >
      <Heading fontSize="xl" textAlign="center">
        {t('theme.sideMenu.title')}
      </Heading>
      <Accordion allowMultiple>
        {currentUserMode === 'write' && (
          <AccordionItem>
            <AccordionButton py={6}>
              <HStack flex="1" pl={2}>
                <TableIcon />
                <Heading fontSize="lg">{t('theme.sideMenu.template')}</Heading>
              </HStack>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={12}>
              {mozbot && (
                <ThemeTemplates
                  selectedTemplateId={templateId}
                  currentTheme={mozbot.theme}
                  workspaceId={mozbot.workspaceId}
                  onTemplateSelect={selectTemplate}
                />
              )}
            </AccordionPanel>
          </AccordionItem>
        )}
        <AccordionItem>
          <AccordionButton py={6}>
            <HStack flex="1" pl={2}>
              <DropletIcon />
              <Heading fontSize="lg">{t('theme.sideMenu.global')}</Heading>
            </HStack>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            {mozbot && (
              <GeneralSettings
                key={templateId}
                isBrandingEnabled={
                  mozbot.settings.general?.isBrandingEnabled ??
                  defaultSettings.general.isBrandingEnabled
                }
                generalTheme={mozbot.theme.general}
                onGeneralThemeChange={updateGeneralTheme}
                onBrandingChange={updateBranding}
              />
            )}
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem>
          <AccordionButton py={6}>
            <HStack flex="1" pl={2}>
              <ChatIcon />
              <Heading fontSize="lg">{t('theme.sideMenu.chat')}</Heading>
            </HStack>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            {mozbot && (
              <ChatThemeSettings
                key={templateId}
                workspaceId={mozbot.workspaceId}
                mozbotId={mozbot.id}
                chatTheme={mozbot.theme.chat}
                generalBackground={mozbot.theme.general?.background}
                onChatThemeChange={updateChatTheme}
              />
            )}
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem>
          <AccordionButton py={6}>
            <HStack flex="1" pl={2}>
              <CodeIcon />
              <Heading fontSize="lg">{t('theme.sideMenu.customCSS')}</Heading>
            </HStack>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            {mozbot && (
              <CustomCssSettings
                key={templateId}
                customCss={mozbot.theme.customCss}
                onCustomCssChange={updateCustomCss}
              />
            )}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Stack>
  )
}
