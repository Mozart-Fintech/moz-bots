import { omit } from '@mozbot.io/lib'
import { Mozbot } from '@mozbot.io/schemas'
import { dequal } from 'dequal'

export const areMozbotsEqual = (mozbotA: Mozbot, mozbotB: Mozbot) =>
  dequal(
    JSON.parse(JSON.stringify(omit(mozbotA, 'updatedAt'))),
    JSON.parse(JSON.stringify(omit(mozbotB, 'updatedAt')))
  )
