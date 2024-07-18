import { Button } from '@chakra-ui/react'
import { ChevronLeftIcon } from '@/components/icons'
import { useMozbotDnd } from '../MozbotDndProvider'
import Link from 'next/link'
import React, { useMemo } from 'react'
import { useTranslate } from '@tolgee/react'

export const BackButton = ({ id }: { id: string | null }) => {
  const { t } = useTranslate()
  const { draggedMozbot, setMouseOverFolderId, mouseOverFolderId } =
    useMozbotDnd()

  const isMozbotOver = useMemo(
    () => draggedMozbot && mouseOverFolderId === id,
    [draggedMozbot, id, mouseOverFolderId]
  )

  const handleMouseEnter = () => setMouseOverFolderId(id)
  const handleMouseLeave = () => setMouseOverFolderId(undefined)
  return (
    <Button
      as={Link}
      href={id ? `/mozbots/folders/${id}` : '/mozbots'}
      leftIcon={<ChevronLeftIcon />}
      variant={'outline'}
      colorScheme={isMozbotOver || draggedMozbot ? 'blue' : 'gray'}
      borderWidth={isMozbotOver ? '2px' : '1px'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {t('back')}
    </Button>
  )
}
