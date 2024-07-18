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
import {
  ChatIcon,
  CodeIcon,
  LockedIcon,
  MoreVerticalIcon,
} from '@/components/icons'
import { Settings } from '@mozbot.io/schemas'
import React from 'react'
import { GeneralSettingsForm } from './GeneralSettingsForm'
import { MetadataForm } from './MetadataForm'
import { TypingEmulationForm } from './TypingEmulationForm'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { SecurityForm } from './SecurityForm'

export const SettingsSideMenu = () => {
  const { mozbot, updateMozbot } = useMozbot()

  const updateTypingEmulation = (
    typingEmulation: Settings['typingEmulation']
  ) =>
    mozbot &&
    updateMozbot({
      updates: { settings: { ...mozbot.settings, typingEmulation } },
    })

  const updateSecurity = (security: Settings['security']) =>
    mozbot &&
    updateMozbot({
      updates: { settings: { ...mozbot.settings, security } },
    })

  const handleGeneralSettingsChange = (general: Settings['general']) =>
    mozbot &&
    updateMozbot({ updates: { settings: { ...mozbot.settings, general } } })

  const handleMetadataChange = (metadata: Settings['metadata']) =>
    mozbot &&
    updateMozbot({ updates: { settings: { ...mozbot.settings, metadata } } })

  return (
    <Stack
      flex="1"
      maxW="400px"
      height="full"
      borderRightWidth={1}
      pt={10}
      spacing={10}
      overflowY="auto"
      pb="20"
    >
      <Heading fontSize="xl" textAlign="center">
        Settings
      </Heading>
      <Accordion allowMultiple defaultIndex={[0]}>
        <AccordionItem>
          <AccordionButton py={6}>
            <HStack flex="1" pl={2}>
              <MoreVerticalIcon transform={'rotate(90deg)'} />
              <Heading fontSize="lg">General</Heading>
            </HStack>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4} px="6">
            {mozbot && (
              <GeneralSettingsForm
                generalSettings={mozbot.settings.general}
                onGeneralSettingsChange={handleGeneralSettingsChange}
              />
            )}
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem>
          <AccordionButton py={6}>
            <HStack flex="1" pl={2}>
              <ChatIcon />
              <Heading fontSize="lg">Typing</Heading>
            </HStack>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4} px="6">
            {mozbot && (
              <TypingEmulationForm
                typingEmulation={mozbot.settings.typingEmulation}
                onUpdate={updateTypingEmulation}
              />
            )}
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem>
          <AccordionButton py={6}>
            <HStack flex="1" pl={2}>
              <LockedIcon />
              <Heading fontSize="lg">Security</Heading>
            </HStack>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4} px="6">
            {mozbot && (
              <SecurityForm
                security={mozbot.settings.security}
                onUpdate={updateSecurity}
              />
            )}
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem>
          <AccordionButton py={6}>
            <HStack flex="1" pl={2}>
              <CodeIcon />
              <Heading fontSize="lg">Metadata</Heading>
            </HStack>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4} px="6">
            {mozbot && (
              <MetadataForm
                workspaceId={mozbot.workspaceId}
                mozbotId={mozbot.id}
                mozbotName={mozbot.name}
                metadata={mozbot.settings.metadata}
                onMetadataChange={handleMetadataChange}
              />
            )}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Stack>
  )
}
