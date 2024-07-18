import { edgeSchema } from '../edge'

export const preprocessMozbot = (mozbot: any) => {
  if (!mozbot || mozbot.version === '5' || mozbot.version === '6') return mozbot
  return {
    ...mozbot,
    version:
      mozbot.version === undefined || mozbot.version === null
        ? '3'
        : mozbot.version,
    groups: mozbot.groups ? mozbot.groups.map(preprocessGroup) : [],
    events: null,
    edges: mozbot.edges
      ? mozbot.edges?.filter((edge: any) => edgeSchema.safeParse(edge).success)
      : [],
  }
}

export const preprocessGroup = (group: any) => ({
  ...group,
  blocks: group.blocks ?? [],
})

export const preprocessColumnsWidthResults = (arg: unknown) =>
  Array.isArray(arg) && arg.length === 0 ? {} : arg
