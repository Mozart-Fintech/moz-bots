import { defaultButtonLabel } from '../constants'
import { ChoiceInputBlock } from './schema'

export const defaultChoiceInputOptions = {
  buttonLabel: defaultButtonLabel,
  searchInputPlaceholder: 'Filter the options...',
  listHeader: 'See options',
  isMultipleChoice: false,
  isSearchable: false,
  withFirstChoice: false,
  withLastChoice: false,
} as const satisfies ChoiceInputBlock['options']
