import { TextInput } from '@/components/inputs'
import { MoreInfoTooltip } from '@/components/MoreInfoTooltip'
import { VariableSearchInput } from '@/components/inputs/VariableSearchInput'
import { FormControl, FormLabel, Stack } from '@chakra-ui/react'
import { ChoiceInputBlock, Variable } from '@mozbot.io/schemas'
import React from 'react'
import { SwitchWithRelatedSettings } from '@/components/SwitchWithRelatedSettings'
import { SwitchWithLabel } from '@/components/inputs/SwitchWithLabel'
import { defaultChoiceInputOptions } from '@mozbot.io/schemas/features/blocks/inputs/choice/constants'
import { useTranslate } from '@tolgee/react'

type Props = {
  options?: ChoiceInputBlock['options']
  onOptionsChange: (options: ChoiceInputBlock['options']) => void
}

export const ButtonsBlockSettings = ({ options, onOptionsChange }: Props) => {
  const { t } = useTranslate()
  const updateIsMultiple = (isMultipleChoice: boolean) =>
    onOptionsChange({ ...options, isMultipleChoice })
  const updateIsSearchable = (isSearchable: boolean) =>
    onOptionsChange({ ...options, isSearchable })
  const updateButtonLabel = (buttonLabel: string) =>
    onOptionsChange({ ...options, buttonLabel })
  const updateHeaderContent = (listHeader: string) =>
    onOptionsChange({ ...options, listHeader })
  const updateSearchInputPlaceholder = (searchInputPlaceholder: string) =>
    onOptionsChange({ ...options, searchInputPlaceholder })
  const updateSaveVariable = (variable?: Variable) =>
    onOptionsChange({ ...options, variableId: variable?.id })
  const updateDynamicDataVariable = (variable?: Variable) =>
    onOptionsChange({ ...options, dynamicVariableId: variable?.id })
  const updateRetryMessageContent = (variable?: Variable) =>
    onOptionsChange({ ...options, retryMessageContentId: variable?.id })
  const updateWithFirstChoice = (withFirstChoice: boolean) =>
    onOptionsChange({ ...options, withFirstChoice })
  const updateWithLastChoice = (withLastChoice: boolean) =>
    onOptionsChange({ ...options, withLastChoice })

  return (
    <Stack spacing={4}>
      <TextInput
        label={t('blocks.inputs.button.list.label')}
        defaultValue={
          options?.listHeader ?? t('blocks.inputs.button.list.placeholder')
        }
        onChange={updateHeaderContent}
      />
      <SwitchWithRelatedSettings
        label={t('blocks.inputs.settings.multipleChoice.label')}
        initialValue={
          options?.isMultipleChoice ??
          defaultChoiceInputOptions.isMultipleChoice
        }
        onCheckChange={updateIsMultiple}
      >
        <TextInput
          label={t('blocks.inputs.settings.submitButton.label')}
          defaultValue={
            options?.buttonLabel ?? t('blocks.inputs.settings.buttonText.label')
          }
          onChange={updateButtonLabel}
        />
      </SwitchWithRelatedSettings>
      <SwitchWithRelatedSettings
        label={t('blocks.inputs.settings.isSearchable.label')}
        initialValue={
          options?.isSearchable ?? defaultChoiceInputOptions.isSearchable
        }
        onCheckChange={updateIsSearchable}
      >
        <TextInput
          label={t('blocks.inputs.settings.input.placeholder.label')}
          defaultValue={
            options?.searchInputPlaceholder ??
            t('blocks.inputs.settings.input.filterOptions.label')
          }
          onChange={updateSearchInputPlaceholder}
        />
      </SwitchWithRelatedSettings>
      <SwitchWithLabel
        label={t('blocks.inputs.button.list.first.label')}
        initialValue={
          options?.withFirstChoice ?? defaultChoiceInputOptions.withFirstChoice
        }
        onCheckChange={updateWithFirstChoice}
      />
      <SwitchWithLabel
        label={t('blocks.inputs.button.list.final.label')}
        initialValue={
          options?.withLastChoice ?? defaultChoiceInputOptions.withLastChoice
        }
        onCheckChange={updateWithLastChoice}
      />
      <Stack>
        <FormLabel mb="0" htmlFor="variable">
          {t('blocks.inputs.button.retry.label')}
        </FormLabel>
        <VariableSearchInput
          initialVariableId={options?.retryMessageContentId}
          onSelectVariable={updateRetryMessageContent}
        />
      </Stack>
      <FormControl>
        <FormLabel>
          {t('blocks.inputs.button.settings.dynamicData.label')}{' '}
          <MoreInfoTooltip>
            {t('blocks.inputs.button.settings.dynamicData.infoText.label')}
          </MoreInfoTooltip>
        </FormLabel>
        <VariableSearchInput
          initialVariableId={options?.dynamicVariableId}
          onSelectVariable={updateDynamicDataVariable}
        />
      </FormControl>
      <Stack>
        <FormLabel mb="0" htmlFor="variable">
          {t('blocks.inputs.settings.saveAnswer.label')}
        </FormLabel>
        <VariableSearchInput
          initialVariableId={options?.variableId}
          onSelectVariable={updateSaveVariable}
        />
      </Stack>
    </Stack>
  )
}
