import { TrashIcon } from '@/components/icons'
import { Seo } from '@/components/Seo'
import { useWorkspace } from '@/features/workspace/WorkspaceProvider'
import { useToast } from '@/hooks/useToast'
import { isCloudProdInstance } from '@/helpers/isCloudProdInstance'
import {
  Flex,
  Heading,
  HStack,
  IconButton,
  Stack,
  Wrap,
  Text,
} from '@chakra-ui/react'
import { Plan } from '@mozbot.io/prisma'
import { isDefined, isNotDefined } from '@mozbot.io/lib'
import { isPublicDomainAvailableQuery } from '../queries/isPublicDomainAvailableQuery'
import { EditableUrl } from './EditableUrl'
import { integrationsList } from './embeds/EmbedButton'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { LockTag } from '@/features/billing/components/LockTag'
import { UpgradeButton } from '@/features/billing/components/UpgradeButton'
import { hasProPerks } from '@/features/billing/helpers/hasProPerks'
import { CustomDomainsDropdown } from '@/features/customDomains/components/CustomDomainsDropdown'
import { MozbotHeader } from '@/features/editor/components/MozbotHeader'
import { parseDefaultPublicId } from '../helpers/parseDefaultPublicId'
import { useTranslate } from '@tolgee/react'
import { env } from '@mozbot.io/env'
import DomainStatusIcon from '@/features/customDomains/components/DomainStatusIcon'
import { MozbotNotFoundPage } from '@/features/editor/components/MozbotNotFoundPage'

export const SharePage = () => {
  const { t } = useTranslate()
  const { workspace } = useWorkspace()
  const { mozbot, updateMozbot, publishedMozbot, is404 } = useMozbot()
  const { showToast } = useToast()

  const handlePublicIdChange = async (publicId: string) => {
    updateMozbot({ updates: { publicId }, save: true })
  }

  const publicId = mozbot
    ? mozbot?.publicId ?? parseDefaultPublicId(mozbot.name, mozbot.id)
    : ''
  const isPublished = isDefined(publishedMozbot)

  const handlePathnameChange = (pathname: string) => {
    if (!mozbot?.customDomain) return
    const existingHost = mozbot.customDomain?.split('/')[0]
    const newDomain =
      pathname === '' ? existingHost : existingHost + '/' + pathname
    handleCustomDomainChange(newDomain)
  }

  const handleCustomDomainChange = (customDomain: string | null) =>
    updateMozbot({ updates: { customDomain }, save: true })

  const checkIfPathnameIsValid = (pathname: string) => {
    const isCorrectlyFormatted =
      /^([a-z0-9]+-[a-z0-9]*)*$/.test(pathname) || /^[a-z0-9]*$/.test(pathname)

    if (!isCorrectlyFormatted) {
      showToast({
        description: 'Can only contain lowercase letters, numbers and dashes.',
      })
      return false
    }
    return true
  }

  const checkIfPublicIdIsValid = async (publicId: string) => {
    const isLongerThanAllowed = publicId.length >= 4
    if (!isLongerThanAllowed && isCloudProdInstance()) {
      showToast({
        description: 'Should be longer than 4 characters',
      })
      return false
    }

    if (!checkIfPathnameIsValid(publicId)) return false

    const { data } = await isPublicDomainAvailableQuery(publicId)
    if (!data?.isAvailable) {
      showToast({ description: 'ID is already taken' })
      return false
    }

    return true
  }

  if (is404) return <MozbotNotFoundPage />
  return (
    <Flex flexDir="column" pb="40">
      <Seo title={mozbot?.name ? `${mozbot.name} | Share` : 'Share'} />
      <MozbotHeader />
      <Flex h="full" w="full" justifyContent="center" align="flex-start">
        <Stack maxW="1000px" w="full" pt="10" spacing={10}>
          <Stack spacing={4} align="flex-start">
            <Heading fontSize="2xl" as="h1">
              Your mozbot link
            </Heading>
            {mozbot && (
              <EditableUrl
                hostname={env.NEXT_PUBLIC_VIEWER_URL[0]}
                pathname={publicId}
                isValid={checkIfPublicIdIsValid}
                onPathnameChange={handlePublicIdChange}
              />
            )}
            {mozbot?.customDomain && (
              <HStack>
                <EditableUrl
                  hostname={'https://' + mozbot.customDomain.split('/')[0]}
                  pathname={mozbot.customDomain.split('/')[1]}
                  isValid={checkIfPathnameIsValid}
                  onPathnameChange={handlePathnameChange}
                />
                <IconButton
                  icon={<TrashIcon />}
                  aria-label="Remove custom URL"
                  size="xs"
                  onClick={() => handleCustomDomainChange(null)}
                />
                {workspace?.id && (
                  <DomainStatusIcon
                    domain={mozbot.customDomain.split('/')[0]}
                    workspaceId={workspace.id}
                  />
                )}
              </HStack>
            )}
            {isNotDefined(mozbot?.customDomain) &&
            env.NEXT_PUBLIC_VERCEL_VIEWER_PROJECT_NAME ? (
              <>
                {hasProPerks(workspace) ? (
                  <CustomDomainsDropdown
                    onCustomDomainSelect={handleCustomDomainChange}
                  />
                ) : (
                  <UpgradeButton
                    colorScheme="gray"
                    limitReachedType={t('billing.limitMessage.customDomain')}
                    excludedPlans={[Plan.STARTER]}
                  >
                    <Text mr="2">Add my domain</Text>{' '}
                    <LockTag plan={Plan.PRO} />
                  </UpgradeButton>
                )}
              </>
            ) : null}
          </Stack>

          <Stack spacing={4}>
            <Heading fontSize="2xl" as="h1">
              Embed your mozbot
            </Heading>
            <Wrap spacing={7}>
              {integrationsList.map((IntegrationButton, idx) => (
                <IntegrationButton
                  key={idx}
                  publicId={publicId}
                  isPublished={isPublished}
                />
              ))}
            </Wrap>
          </Stack>
        </Stack>
      </Flex>
    </Flex>
  )
}
