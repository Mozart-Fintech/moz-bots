import {
  Button,
  HStack,
  IconButton,
  Stack,
  Tooltip,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  ButtonProps,
} from '@chakra-ui/react'
import {
  ChevronLeftIcon,
  CloudOffIcon,
  LockedIcon,
  UnlockedIcon,
} from '@/components/icons'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { useWorkspace } from '@/features/workspace/WorkspaceProvider'
import { useRouter } from 'next/router'
import { isNotDefined } from '@mozbot.io/lib'
import { ChangePlanModal } from '@/features/billing/components/ChangePlanModal'
import { isFreePlan } from '@/features/billing/helpers/isFreePlan'
import { T, useTranslate } from '@tolgee/react'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/useToast'
import { parseDefaultPublicId } from '../helpers/parseDefaultPublicId'
import { InputBlockType } from '@mozbot.io/schemas/features/blocks/inputs/constants'
import { ConfirmModal } from '@/components/ConfirmModal'
import { TextLink } from '@/components/TextLink'
import { useTimeSince } from '@/hooks/useTimeSince'

type Props = ButtonProps & {
  isMoreMenuDisabled?: boolean
}
export const PublishButton = ({
  isMoreMenuDisabled = false,
  ...props
}: Props) => {
  const { t } = useTranslate()
  const { workspace } = useWorkspace()
  const { push, query, pathname } = useRouter()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    isOpen: isNewEngineWarningOpen,
    onOpen: onNewEngineWarningOpen,
    onClose: onNewEngineWarningClose,
  } = useDisclosure()
  const {
    isPublished,
    publishedMozbot,
    restorePublishedMozbot,
    mozbot,
    isSavingLoading,
    updateMozbot,
    save,
    publishedMozbotVersion,
  } = useMozbot()
  const timeSinceLastPublish = useTimeSince(
    publishedMozbot?.updatedAt.toString()
  )
  const { showToast } = useToast()

  const {
    mozbot: {
      getPublishedMozbot: { refetch: refetchPublishedMozbot },
    },
  } = trpc.useContext()

  const { mutate: publishMozbotMutate, isLoading: isPublishing } =
    trpc.mozbot.publishMozbot.useMutation({
      onError: (error) => {
        showToast({
          title: t('publish.error.label'),
          description: error.message,
        })
        if (error.data?.httpStatus === 403) {
          setTimeout(() => {
            window.location.reload()
          }, 3000)
        }
      },
      onSuccess: () => {
        refetchPublishedMozbot({
          mozbotId: mozbot?.id as string,
        })
        if (!publishedMozbot && !pathname.endsWith('share'))
          push(`/mozbots/${query.mozbotId}/share`)
      },
    })

  const { mutate: unpublishMozbotMutate, isLoading: isUnpublishing } =
    trpc.mozbot.unpublishMozbot.useMutation({
      onError: (error) =>
        showToast({
          title: t('editor.header.unpublishMozbot.error.label'),
          description: error.message,
        }),
      onSuccess: () => {
        refetchPublishedMozbot()
      },
    })

  const hasInputFile = mozbot?.groups
    .flatMap((g) => g.blocks)
    .some((b) => b.type === InputBlockType.FILE)

  const handlePublishClick = async () => {
    if (!mozbot?.id) return
    if (isFreePlan(workspace) && hasInputFile) return onOpen()
    await save(
      !mozbot.publicId
        ? { publicId: parseDefaultPublicId(mozbot.name, mozbot.id) }
        : undefined,
      true
    )
    publishMozbotMutate({
      mozbotId: mozbot.id,
    })
  }

  const unpublishMozbot = async () => {
    if (!mozbot?.id) return
    if (mozbot.isClosed)
      await updateMozbot({ updates: { isClosed: false }, save: true })
    unpublishMozbotMutate({
      mozbotId: mozbot?.id,
    })
  }

  const closeMozbot = async () => {
    await updateMozbot({ updates: { isClosed: true }, save: true })
  }

  const openMozbot = async () => {
    await updateMozbot({ updates: { isClosed: false }, save: true })
  }

  return (
    <HStack spacing="1px">
      <ChangePlanModal
        isOpen={isOpen}
        onClose={onClose}
        type={t('billing.limitMessage.fileInput')}
      />
      {publishedMozbot && publishedMozbotVersion !== mozbot?.version && (
        <ConfirmModal
          isOpen={isNewEngineWarningOpen}
          onConfirm={handlePublishClick}
          onClose={onNewEngineWarningClose}
          confirmButtonColor="blue"
          title={t('publish.versionWarning.title.label')}
          message={
            <Stack spacing="3">
              <Text>
                {t('publish.versionWarning.message.aboutToDeploy.label')}
              </Text>
              <Text fontWeight="bold">
                <T
                  keyName="publish.versionWarning.checkBreakingChanges"
                  params={{
                    link: (
                      <TextLink
                        href="https://docs.mozbot.io/breaking-changes#mozbot-v6"
                        isExternal
                      />
                    ),
                  }}
                />
              </Text>
              <Text>
                {t('publish.versionWarning.message.testInPreviewMode.label')}
              </Text>
            </Stack>
          }
          confirmButtonLabel={t('publishButton.label')}
        />
      )}
      <Tooltip
        placement="bottom-end"
        label={
          <Stack>
            <Text>{t('publishButton.tooltip.nonPublishedChanges.label')}</Text>
            {timeSinceLastPublish ? (
              <Text fontStyle="italic">
                <T
                  keyName="publishButton.tooltip.publishedVersion.from.label"
                  params={{
                    timeSince: timeSinceLastPublish,
                  }}
                />
              </Text>
            ) : null}
          </Stack>
        }
        isDisabled={isNotDefined(publishedMozbot) || isPublished}
      >
        <Button
          colorScheme="blue"
          isLoading={isPublishing || isUnpublishing}
          isDisabled={isPublished || isSavingLoading}
          onClick={() => {
            publishedMozbot && publishedMozbotVersion !== mozbot?.version
              ? onNewEngineWarningOpen()
              : handlePublishClick()
          }}
          borderRightRadius={
            publishedMozbot && !isMoreMenuDisabled ? 0 : undefined
          }
          {...props}
        >
          {isPublished
            ? mozbot?.isClosed
              ? t('publishButton.closed.label')
              : t('publishButton.published.label')
            : t('publishButton.label')}
        </Button>
      </Tooltip>

      {!isMoreMenuDisabled && publishedMozbot && (
        <Menu>
          <MenuButton
            as={IconButton}
            colorScheme={'blue'}
            borderLeftRadius={0}
            icon={<ChevronLeftIcon transform="rotate(-90deg)" />}
            aria-label={t('publishButton.dropdown.showMenu.label')}
            size="sm"
            isDisabled={isPublishing || isSavingLoading}
          />
          <MenuList>
            {!isPublished && (
              <MenuItem onClick={restorePublishedMozbot}>
                {t('publishButton.dropdown.restoreVersion.label')}
              </MenuItem>
            )}
            {!mozbot?.isClosed ? (
              <MenuItem onClick={closeMozbot} icon={<LockedIcon />}>
                {t('publishButton.dropdown.close.label')}
              </MenuItem>
            ) : (
              <MenuItem onClick={openMozbot} icon={<UnlockedIcon />}>
                {t('publishButton.dropdown.reopen.label')}
              </MenuItem>
            )}
            <MenuItem onClick={unpublishMozbot} icon={<CloudOffIcon />}>
              {t('publishButton.dropdown.unpublish.label')}
            </MenuItem>
          </MenuList>
        </Menu>
      )}
    </HStack>
  )
}
