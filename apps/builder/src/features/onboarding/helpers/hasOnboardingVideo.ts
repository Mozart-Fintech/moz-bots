import { ForgedBlockDefinition } from '@mozbot.io/forge-repository/types'
import { Block } from '@mozbot.io/schemas'
import { onboardingVideos } from '../data'
import { isDefined } from '@mozbot.io/lib/utils'

type Props = {
  blockType: Block['type']
  blockDef?: ForgedBlockDefinition
}
export const hasOnboardingVideo = ({ blockType, blockDef }: Props) =>
  isDefined(
    blockDef?.onboarding?.youtubeId ?? onboardingVideos[blockType]?.youtubeId
  )
