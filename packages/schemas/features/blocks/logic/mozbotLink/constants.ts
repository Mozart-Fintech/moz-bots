import { MozbotLinkBlock } from './schema'

export const defaultMozbotLinkOptions = {
  mergeResults: false,
} as const satisfies MozbotLinkBlock['options']
