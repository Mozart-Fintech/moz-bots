import { fetchLinkedMozbots } from './fetchLinkedMozbots'

type Props = {
  parentmozbotIds: string[]
  userId: string | undefined
  isPreview?: boolean
}

export const fetchLinkedParentMozbots = ({
  parentmozbotIds,
  isPreview,
  userId,
}: Props) =>
  parentmozbotIds.length > 0
    ? fetchLinkedMozbots({
        mozbotIds: parentmozbotIds,
        isPreview,
        userId,
      })
    : []
