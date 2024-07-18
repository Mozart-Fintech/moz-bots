import {
  Flex,
  HStack,
  Button,
  IconButton,
  Tooltip,
  Spinner,
  Text,
  useColorModeValue,
  useDisclosure,
  StackProps,
  chakra,
} from '@chakra-ui/react'
import {
  BuoyIcon,
  ChevronLeftIcon,
  CopyIcon,
  PlayIcon,
  RedoIcon,
  UndoIcon,
} from '@/components/icons'
import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { isDefined, isNotDefined } from '@mozbot.io/lib'
import { EditableMozbotName } from './EditableMozbotName'
import Link from 'next/link'
import { EditableEmojiOrImageIcon } from '@/components/EditableEmojiOrImageIcon'
import { useDebouncedCallback } from 'use-debounce'
import { ShareMozbotButton } from '@/features/share/components/ShareMozbotButton'
import { PublishButton } from '@/features/publish/components/PublishButton'
import { headerHeight } from '../constants'
import { RightPanel, useEditor } from '../providers/EditorProvider'
import { useMozbot } from '../providers/MozbotProvider'
import { SupportBubble } from '@/components/SupportBubble'
import { isCloudProdInstance } from '@/helpers/isCloudProdInstance'
import { useTranslate } from '@tolgee/react'
import { GuestMozbotHeader } from './UnauthenticatedMozbotHeader'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useWorkspace } from '@/features/workspace/WorkspaceProvider'
import { Plan } from '@mozbot.io/prisma'

export const MozbotHeader = () => {
  const { mozbot, publishedMozbot, currentUserMode } = useMozbot()
  const { workspace } = useWorkspace()

  const { isOpen, onOpen } = useDisclosure()
  const headerBgColor = useColorModeValue('white', 'gray.900')

  const handleHelpClick = () => {
    isCloudProdInstance() && workspace?.plan && workspace.plan !== Plan.FREE
      ? onOpen()
      : window.open('https://docs.mozbot.io/guides/how-to-get-help', '_blank')
  }

  if (currentUserMode === 'guest') return <GuestMozbotHeader />
  return (
    <Flex
      w="full"
      borderBottomWidth="1px"
      justify="center"
      align="center"
      h={`${headerHeight}px`}
      zIndex={1}
      pos="relative"
      bgColor={headerBgColor}
      flexShrink={0}
    >
      {isOpen && <SupportBubble autoShowDelay={0} />}
      <LeftElements pos="absolute" left="1rem" onHelpClick={handleHelpClick} />
      <MozbotNav
        display={{ base: 'none', xl: 'flex' }}
        pos={{ base: 'absolute' }}
        mozbotId={mozbot?.id}
        isResultsDisplayed={isDefined(publishedMozbot)}
      />
      <RightElements
        right="40px"
        pos="absolute"
        display={['none', 'flex']}
        isResultsDisplayed={isDefined(publishedMozbot)}
      />
    </Flex>
  )
}

const LeftElements = ({
  onHelpClick,
  ...props
}: StackProps & { onHelpClick: () => void }) => {
  const { t } = useTranslate()
  const router = useRouter()
  const {
    mozbot,
    updateMozbot,
    canUndo,
    canRedo,
    undo,
    redo,
    currentUserMode,
    isSavingLoading,
  } = useMozbot()

  const [isRedoShortcutTooltipOpen, setRedoShortcutTooltipOpen] =
    useState(false)

  const [isUndoShortcutTooltipOpen, setUndoShortcutTooltipOpen] =
    useState(false)

  const hideUndoShortcutTooltipLater = useDebouncedCallback(() => {
    setUndoShortcutTooltipOpen(false)
  }, 1000)

  const hideRedoShortcutTooltipLater = useDebouncedCallback(() => {
    setRedoShortcutTooltipOpen(false)
  }, 1000)

  const handleNameSubmit = (name: string) => updateMozbot({ updates: { name } })

  const handleChangeIcon = (icon: string) => updateMozbot({ updates: { icon } })

  useKeyboardShortcuts({
    undo: () => {
      if (!canUndo) return
      hideUndoShortcutTooltipLater.flush()
      setUndoShortcutTooltipOpen(true)
      hideUndoShortcutTooltipLater()
      undo()
    },
    redo: () => {
      if (!canRedo) return
      hideUndoShortcutTooltipLater.flush()
      setRedoShortcutTooltipOpen(true)
      hideRedoShortcutTooltipLater()
      redo()
    },
  })

  return (
    <HStack justify="center" align="center" spacing="6" {...props}>
      <HStack alignItems="center" spacing={3}>
        <IconButton
          as={Link}
          aria-label="Navigate back"
          icon={<ChevronLeftIcon fontSize={25} />}
          href={{
            pathname: router.query.parentId
              ? '/mozbots/[mozbotId]/edit'
              : mozbot?.folderId
              ? '/mozbots/folders/[id]'
              : '/mozbots',
            query: {
              id: mozbot?.folderId ?? [],
              parentId: Array.isArray(router.query.parentId)
                ? router.query.parentId.slice(0, -1)
                : [],
              mozbotId: Array.isArray(router.query.parentId)
                ? [...router.query.parentId].pop()
                : router.query.parentId ?? [],
            },
          }}
          size="sm"
        />
        <HStack spacing={1}>
          {mozbot && (
            <EditableEmojiOrImageIcon
              uploadFileProps={{
                workspaceId: mozbot.workspaceId,
                mozbotId: mozbot.id,
                fileName: 'icon',
              }}
              icon={mozbot?.icon}
              onChangeIcon={handleChangeIcon}
            />
          )}
          (
          <EditableMozbotName
            key={`mozbot-name-${mozbot?.name ?? ''}`}
            defaultName={mozbot?.name ?? ''}
            onNewName={handleNameSubmit}
          />
          )
        </HStack>

        {currentUserMode === 'write' && (
          <HStack>
            <Tooltip
              label={
                isUndoShortcutTooltipOpen
                  ? t('editor.header.undo.tooltip.label')
                  : t('editor.header.undoButton.label')
              }
              isOpen={isUndoShortcutTooltipOpen ? true : undefined}
              hasArrow={isUndoShortcutTooltipOpen}
            >
              <IconButton
                display={['none', 'flex']}
                icon={<UndoIcon />}
                size="sm"
                aria-label={t('editor.header.undoButton.label')}
                onClick={undo}
                isDisabled={!canUndo}
              />
            </Tooltip>

            <Tooltip
              label={
                isRedoShortcutTooltipOpen
                  ? t('editor.header.undo.tooltip.label')
                  : t('editor.header.redoButton.label')
              }
              isOpen={isRedoShortcutTooltipOpen ? true : undefined}
              hasArrow={isRedoShortcutTooltipOpen}
            >
              <IconButton
                display={['none', 'flex']}
                icon={<RedoIcon />}
                size="sm"
                aria-label={t('editor.header.redoButton.label')}
                onClick={redo}
                isDisabled={!canRedo}
              />
            </Tooltip>
          </HStack>
        )}
        <Button
          leftIcon={<BuoyIcon />}
          onClick={onHelpClick}
          size="sm"
          iconSpacing={{ base: 0, xl: 2 }}
        >
          <chakra.span display={{ base: 'none', xl: 'inline' }}>
            {t('editor.header.helpButton.label')}
          </chakra.span>
        </Button>
      </HStack>
      {isSavingLoading && (
        <HStack>
          <Spinner speed="0.7s" size="sm" color="gray.400" />
          <Text fontSize="sm" color="gray.400">
            {t('editor.header.savingSpinner.label')}
          </Text>
        </HStack>
      )}
    </HStack>
  )
}

const RightElements = ({
  isResultsDisplayed,
  ...props
}: StackProps & { isResultsDisplayed: boolean }) => {
  const router = useRouter()
  const { t } = useTranslate()
  const { mozbot, currentUserMode, save, isSavingLoading } = useMozbot()
  const {
    setRightPanel,
    rightPanel,
    setStartPreviewAtGroup,
    setStartPreviewAtEvent,
  } = useEditor()

  const handlePreviewClick = async () => {
    setStartPreviewAtGroup(undefined)
    setStartPreviewAtEvent(undefined)
    await save()
    setRightPanel(RightPanel.PREVIEW)
  }

  return (
    <HStack {...props}>
      <MozbotNav
        display={{ base: 'none', md: 'flex', xl: 'none' }}
        mozbotId={mozbot?.id}
        isResultsDisplayed={isResultsDisplayed}
      />
      <Flex pos="relative">
        <ShareMozbotButton isLoading={isNotDefined(mozbot)} />
      </Flex>
      {router.pathname.includes('/edit') &&
        rightPanel !== RightPanel.PREVIEW && (
          <Button
            colorScheme="gray"
            onClick={handlePreviewClick}
            isLoading={isNotDefined(mozbot) || isSavingLoading}
            leftIcon={<PlayIcon />}
            size="sm"
            iconSpacing={{ base: 0, xl: 2 }}
          >
            <chakra.span display={{ base: 'none', xl: 'inline' }}>
              {t('editor.header.previewButton.label')}
            </chakra.span>
          </Button>
        )}
      {currentUserMode === 'guest' && (
        <Button
          as={Link}
          href={`/mozbots/${mozbot?.id}/duplicate`}
          leftIcon={<CopyIcon />}
          isLoading={isNotDefined(mozbot)}
          size="sm"
        >
          Duplicate
        </Button>
      )}
      {currentUserMode === 'write' && <PublishButton size="sm" />}
    </HStack>
  )
}

const MozbotNav = ({
  mozbotId,
  isResultsDisplayed,
  ...stackProps
}: {
  mozbotId?: string
  isResultsDisplayed: boolean
} & StackProps) => {
  const { t } = useTranslate()
  const router = useRouter()

  return (
    <HStack {...stackProps}>
      <Button
        as={Link}
        href={`/mozbots/${mozbotId}/edit`}
        colorScheme={router.pathname.includes('/edit') ? 'blue' : 'gray'}
        variant={router.pathname.includes('/edit') ? 'outline' : 'ghost'}
        size="sm"
      >
        {t('editor.header.flowButton.label')}
      </Button>
      <Button
        as={Link}
        href={`/mozbots/${mozbotId}/theme`}
        colorScheme={router.pathname.endsWith('theme') ? 'blue' : 'gray'}
        variant={router.pathname.endsWith('theme') ? 'outline' : 'ghost'}
        size="sm"
      >
        {t('editor.header.themeButton.label')}
      </Button>
      <Button
        as={Link}
        href={`/mozbots/${mozbotId}/settings`}
        colorScheme={router.pathname.endsWith('settings') ? 'blue' : 'gray'}
        variant={router.pathname.endsWith('settings') ? 'outline' : 'ghost'}
        size="sm"
      >
        {t('editor.header.settingsButton.label')}
      </Button>
      <Button
        as={Link}
        href={`/mozbots/${mozbotId}/share`}
        colorScheme={router.pathname.endsWith('share') ? 'blue' : 'gray'}
        variant={router.pathname.endsWith('share') ? 'outline' : 'ghost'}
        size="sm"
      >
        {t('share.button.label')}
      </Button>
      {isResultsDisplayed && (
        <Button
          as={Link}
          href={`/mozbots/${mozbotId}/results`}
          colorScheme={router.pathname.includes('results') ? 'blue' : 'gray'}
          variant={router.pathname.includes('results') ? 'outline' : 'ghost'}
          size="sm"
        >
          {t('editor.header.resultsButton.label')}
        </Button>
      )}
    </HStack>
  )
}
