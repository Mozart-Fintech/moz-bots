import { Mozbot, PublicMozbot } from '@mozbot.io/schemas'
import { diff } from 'deep-object-diff'
import { dequal } from 'dequal'

export const isPublished = (
  mozbot: Mozbot,
  publicMozbot: PublicMozbot,
  debug?: boolean
) => {
  if (debug)
    console.log(
      'diff:',
      diff(
        JSON.parse(JSON.stringify(mozbot.groups)),
        JSON.parse(JSON.stringify(publicMozbot.groups))
      )
    )
  return (
    dequal(
      JSON.parse(JSON.stringify(mozbot.groups)),
      JSON.parse(JSON.stringify(publicMozbot.groups))
    ) &&
    dequal(
      JSON.parse(JSON.stringify(mozbot.settings)),
      JSON.parse(JSON.stringify(publicMozbot.settings))
    ) &&
    dequal(
      JSON.parse(JSON.stringify(mozbot.theme)),
      JSON.parse(JSON.stringify(publicMozbot.theme))
    ) &&
    dequal(
      JSON.parse(JSON.stringify(mozbot.variables)),
      JSON.parse(JSON.stringify(publicMozbot.variables))
    ) &&
    dequal(
      JSON.parse(JSON.stringify(mozbot.events)),
      JSON.parse(JSON.stringify(publicMozbot.events))
    )
  )
}
