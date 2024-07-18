import {
  Flex,
  FormLabel,
  Stack,
  Switch,
  useDisclosure,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react'
import { Background, Font, ProgressBar, Theme } from '@mozbot.io/schemas'
import React from 'react'
import { BackgroundSelector } from './BackgroundSelector'
import { LockTag } from '@/features/billing/components/LockTag'
import { Plan } from '@mozbot.io/prisma'
import { isFreePlan } from '@/features/billing/helpers/isFreePlan'
import { useWorkspace } from '@/features/workspace/WorkspaceProvider'
import { ChangePlanModal } from '@/features/billing/components/ChangePlanModal'
import { useTranslate } from '@tolgee/react'
import {
  defaultFontType,
  fontTypes,
} from '@mozbot.io/schemas/features/mozbot/theme/constants'
import { trpc } from '@/lib/trpc'
import { env } from '@mozbot.io/env'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { RadioButtons } from '@/components/inputs/RadioButtons'
import { FontForm } from './FontForm'
import { ProgressBarForm } from './ProgressBarForm'

type Props = {
  isBrandingEnabled: boolean
  generalTheme: Theme['general']
  onGeneralThemeChange: (general: Theme['general']) => void
  onBrandingChange: (isBrandingEnabled: boolean) => void
}

export const GeneralSettings = ({
  isBrandingEnabled,
  generalTheme,
  onGeneralThemeChange,
  onBrandingChange,
}: Props) => {
  const { t } = useTranslate()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { workspace } = useWorkspace()
  const { mozbot } = useMozbot()
  const isWorkspaceFreePlan = isFreePlan(workspace)

  const { mutate: trackClientEvents } =
    trpc.telemetry.trackClientEvents.useMutation()

  const updateFont = (font: Font) =>
    onGeneralThemeChange({ ...generalTheme, font })

  const updateFontType = (type: (typeof fontTypes)[number]) => {
    onGeneralThemeChange({
      ...generalTheme,
      font:
        typeof generalTheme?.font === 'string'
          ? { type }
          : { ...generalTheme?.font, type },
    })
  }

  const handleBackgroundChange = (background: Background) =>
    onGeneralThemeChange({ ...generalTheme, background })

  const updateProgressBar = (progressBar: ProgressBar) =>
    onGeneralThemeChange({ ...generalTheme, progressBar })

  const updateBranding = () => {
    if (isBrandingEnabled && isWorkspaceFreePlan) return
    if (
      env.NEXT_PUBLIC_POSTHOG_KEY &&
      mozbot &&
      workspace &&
      isBrandingEnabled
    ) {
      trackClientEvents({
        events: [
          {
            name: 'Branding removed',
            mozbotId: mozbot.id,
            workspaceId: workspace.id,
          },
        ],
      })
    }
    onBrandingChange(!isBrandingEnabled)
  }

  const fontType =
    (typeof generalTheme?.font === 'string'
      ? 'Google'
      : generalTheme?.font?.type) ?? defaultFontType

  return (
    <Stack spacing={6}>
      <ChangePlanModal
        isOpen={isOpen}
        onClose={onClose}
        type={t('billing.limitMessage.brand')}
      />
      <Flex
        justifyContent="space-between"
        align="center"
        onClick={isWorkspaceFreePlan ? onOpen : undefined}
      >
        <FormLabel htmlFor="branding" mb="0" cursor="pointer">
          {t('theme.sideMenu.global.mozbotBrand')}{' '}
          {isWorkspaceFreePlan && <LockTag plan={Plan.STARTER} />}
        </FormLabel>
        <Switch
          id="branding"
          isChecked={isBrandingEnabled}
          onChange={updateBranding}
        />
      </Flex>
      <Accordion allowToggle>
        <AccordionItem>
          <AccordionButton justifyContent="space-between">
            Progress Bar
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel>
            <ProgressBarForm
              progressBar={generalTheme?.progressBar}
              onProgressBarChange={updateProgressBar}
            />
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem>
          <AccordionButton justifyContent="space-between">
            {t('theme.sideMenu.global.font')}
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel as={Stack}>
            <RadioButtons
              options={fontTypes}
              defaultValue={fontType}
              onSelect={updateFontType}
            />
            <FontForm font={generalTheme?.font} onFontChange={updateFont} />
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem>
          <AccordionButton justifyContent="space-between">
            {t('theme.sideMenu.global.background')}
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel>
            <BackgroundSelector
              background={generalTheme?.background}
              onBackgroundChange={handleBackgroundChange}
            />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Stack>
  )
}
