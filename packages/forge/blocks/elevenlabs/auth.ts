import { option, AuthDefinition } from '@mozbot.io/forge'

export const auth = {
  type: 'encryptedCredentials',
  name: 'ElevenLabs account',
  schema: option.object({
    apiKey: option.string.layout({
      label: 'API key',
      isRequired: true,
      inputType: 'password',
      helperText:
        'You can generate an API key in your ElevenLabs dashboard in the Profile menu.',
      isDebounceDisabled: true,
      withVariableButton: false,
    }),
  }),
} satisfies AuthDefinition
