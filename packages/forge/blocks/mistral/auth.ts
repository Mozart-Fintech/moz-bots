import { option, AuthDefinition } from '@mozbot.io/forge'

export const auth = {
  type: 'encryptedCredentials',
  name: 'Mistral account',
  schema: option.object({
    apiKey: option.string.layout({
      label: 'API key',
      isRequired: true,
      inputType: 'password',
      helperText:
        'You can generate an API key [here](https://console.mistral.ai/api-keys).',
      isDebounceDisabled: true,
    }),
  }),
} satisfies AuthDefinition
