import {
  PublicMozbot,
  PublicMozbotV6,
  Mozbot,
  MozbotV6,
} from '@mozbot.io/schemas'
import { migrateMozbotFromV3ToV4 } from './migrateMozbotFromV3ToV4'
import { migrateMozbotFromV5ToV6 } from './migrateMozbotFromV5ToV6'

export const migrateMozbot = async (mozbot: Mozbot): Promise<MozbotV6> => {
  if (mozbot.version === '6') return mozbot
  let migratedMozbot: any = mozbot
  if (migratedMozbot.version === '3')
    migratedMozbot = await migrateMozbotFromV3ToV4(mozbot)
  if (migratedMozbot.version === '4' || migratedMozbot.version === '5')
    migratedMozbot = migrateMozbotFromV5ToV6(migratedMozbot)
  return migratedMozbot
}

export const migratePublicMozbot = async (
  mozbot: PublicMozbot
): Promise<PublicMozbotV6> => {
  if (mozbot.version === '6') return mozbot
  let migratedMozbot: any = mozbot
  if (migratedMozbot.version === '3')
    migratedMozbot = await migrateMozbotFromV3ToV4(mozbot)
  if (migratedMozbot.version === '4' || migratedMozbot.version === '5')
    migratedMozbot = migrateMozbotFromV5ToV6(migratedMozbot)
  return migratedMozbot
}
