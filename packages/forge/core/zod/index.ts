import { z } from 'zod'
import {
  extendWithMozbotLayout,
  ZodLayoutMetadata,
} from './extendWithMozbotLayout'

extendWithMozbotLayout(z)

export { z }
export type { ZodLayoutMetadata }
