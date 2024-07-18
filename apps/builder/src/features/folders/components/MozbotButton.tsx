import React, { memo } from 'react'
import {
  Alert,
  AlertIcon,
  Button,
  Flex,
  IconButton,
  MenuItem,
  Stack,
  Tag,
  Text,
  useDisclosure,
  VStack,
  WrapItem,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { ConfirmModal } from '@/components/ConfirmModal'
import { GripIcon } from '@/components/icons'
import { useDebounce } from 'use-debounce'
import { useToast } from '@/hooks/useToast'
import { MoreButton } from './MoreButton'
import { EmojiOrImageIcon } from '@/components/EmojiOrImageIcon'
import { T, useTranslate } from '@tolgee/react'
import { MozbotInDashboard } from '@/features/dashboard/types'
import { isMobile } from '@/helpers/isMobile'
import { trpc, trpcVanilla } from '@/lib/trpc'
import { duplicateName } from '@/features/mozbot/helpers/duplicateName'
import {
  NodePosition,
  useDragDistance,
} from '@/features/graph/providers/GraphDndProvider'

type Props = {
  mozbot: MozbotInDashboard
  isReadOnly?: boolean
  draggedMozbot: MozbotInDashboard | undefined
  onMozbotUpdated: () => void
  onDrag: (position: NodePosition) => void
}

const MozbotButton = ({
  mozbot,
  isReadOnly = false,
  draggedMozbot,
  onMozbotUpdated,
  onDrag,
}: Props) => {
  const { t } = useTranslate()
  const router = useRouter()
  const [draggedMozbotDebounced] = useDebounce(draggedMozbot, 200)
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure()
  const buttonRef = React.useRef<HTMLDivElement>(null)

  useDragDistance({
    ref: buttonRef,
    onDrag,
    deps: [],
  })

  const { showToast } = useToast()

  const { mutate: importMozbot } = trpc.mozbot.importMozbot.useMutation({
    onError: (error) => {
      showToast({ description: error.message })
    },
    onSuccess: ({ mozbot }) => {
      router.push(`/mozbots/${mozbot.id}/edit`)
    },
  })

  const { mutate: deleteMozbot } = trpc.mozbot.deleteMozbot.useMutation({
    onError: (error) => {
      showToast({ description: error.message })
    },
    onSuccess: () => {
      onMozbotUpdated()
    },
  })

  const { mutate: unpublishMozbot } = trpc.mozbot.unpublishMozbot.useMutation({
    onError: (error) => {
      showToast({ description: error.message })
    },
    onSuccess: () => {
      onMozbotUpdated()
    },
  })

  const handleMozbotClick = () => {
    if (draggedMozbotDebounced) return
    router.push(
      isMobile ? `/mozbots/${mozbot.id}/results` : `/mozbots/${mozbot.id}/edit`
    )
  }

  const handleDeleteMozbotClick = async () => {
    if (isReadOnly) return
    deleteMozbot({
      mozbotId: mozbot.id,
    })
  }

  const handleDuplicateClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const { mozbot: mozbotToDuplicate } =
      await trpcVanilla.mozbot.getMozbot.query({
        mozbotId: mozbot.id,
      })
    if (!mozbotToDuplicate) return
    importMozbot({
      workspaceId: mozbotToDuplicate.workspaceId,
      mozbot: {
        ...mozbotToDuplicate,
        name: duplicateName(mozbotToDuplicate.name),
      },
    })
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDeleteOpen()
  }

  const handleUnpublishClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!mozbot.publishedmozbotId) return
    unpublishMozbot({ mozbotId: mozbot.id })
  }

  return (
    <Button
      ref={buttonRef}
      as={WrapItem}
      onClick={handleMozbotClick}
      display="flex"
      flexDir="column"
      variant="outline"
      w="225px"
      h="270px"
      rounded="lg"
      whiteSpace="normal"
      opacity={draggedMozbot ? 0.3 : 1}
      cursor="pointer"
    >
      {mozbot.publishedmozbotId && (
        <Tag
          colorScheme="blue"
          variant="solid"
          rounded="full"
          pos="absolute"
          top="27px"
          size="sm"
        >
          {t('folders.mozbotButton.live')}
        </Tag>
      )}
      {!isReadOnly && (
        <>
          <IconButton
            icon={<GripIcon />}
            pos="absolute"
            top="20px"
            left="20px"
            aria-label="Drag"
            cursor="grab"
            variant="ghost"
            colorScheme="blue"
            size="sm"
          />
          <MoreButton
            pos="absolute"
            top="20px"
            right="20px"
            aria-label={t('folders.mozbotButton.showMoreOptions')}
          >
            {mozbot.publishedmozbotId && (
              <MenuItem onClick={handleUnpublishClick}>
                {t('folders.mozbotButton.unpublish')}
              </MenuItem>
            )}
            <MenuItem onClick={handleDuplicateClick}>
              {t('folders.mozbotButton.duplicate')}
            </MenuItem>
            <MenuItem color="red.400" onClick={handleDeleteClick}>
              {t('folders.mozbotButton.delete')}
            </MenuItem>
          </MoreButton>
        </>
      )}
      <VStack spacing="4">
        <Flex
          rounded="full"
          justifyContent="center"
          alignItems="center"
          fontSize={'4xl'}
        >
          {<EmojiOrImageIcon icon={mozbot.icon} boxSize={'35px'} />}
        </Flex>
        <Text textAlign="center" noOfLines={4} maxW="180px">
          {mozbot.name}
        </Text>
      </VStack>
      {!isReadOnly && (
        <ConfirmModal
          message={
            <Stack spacing="4">
              <Text>
                <T
                  keyName="folders.mozbotButton.deleteConfirmationMessage"
                  params={{
                    strong: <strong>{mozbot.name}</strong>,
                  }}
                />
              </Text>
              <Alert status="warning">
                <AlertIcon />
                {t('folders.mozbotButton.deleteConfirmationMessageWarning')}
              </Alert>
            </Stack>
          }
          confirmButtonLabel={t('delete')}
          onConfirm={handleDeleteMozbotClick}
          isOpen={isDeleteOpen}
          onClose={onDeleteClose}
        />
      )}
    </Button>
  )
}

export default memo(
  MozbotButton,
  (prev, next) =>
    prev.draggedMozbot?.id === next.draggedMozbot?.id &&
    prev.mozbot.id === next.mozbot.id &&
    prev.isReadOnly === next.isReadOnly &&
    prev.mozbot.name === next.mozbot.name &&
    prev.mozbot.icon === next.mozbot.icon &&
    prev.mozbot.publishedmozbotId === next.mozbot.publishedmozbotId
)
