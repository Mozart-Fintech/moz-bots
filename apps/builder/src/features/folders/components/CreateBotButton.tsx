import { Button, ButtonProps, Text, VStack } from '@chakra-ui/react'
import { PlusIcon } from '@/components/icons'
import { useRouter } from 'next/router'
import { stringify } from 'qs'
import React from 'react'
import { useTranslate } from '@tolgee/react'
import { useMozbotDnd } from '../MozbotDndProvider'

export const CreateBotButton = ({
  folderId,
  ...props
}: { folderId?: string } & ButtonProps) => {
  const { t } = useTranslate()
  const router = useRouter()
  const { draggedMozbot } = useMozbotDnd()

  const handleClick = () =>
    router.push(
      `/mozbots/create?${stringify({
        folderId,
      })}`
    )

  return (
    <Button
      style={{ width: '225px', height: '270px' }}
      onClick={handleClick}
      paddingX={6}
      whiteSpace={'normal'}
      colorScheme="blue"
      opacity={draggedMozbot ? 0.3 : 1}
      {...props}
    >
      <VStack spacing="6">
        <PlusIcon fontSize="40px" />
        <Text
          fontSize={18}
          fontWeight="medium"
          maxW={40}
          textAlign="center"
          mt="6"
        >
          {t('folders.createMozbotButton.label')}
        </Text>
      </VStack>
    </Button>
  )
}
