import {
  Stack,
  HStack,
  Text,
  Spinner,
  Alert,
  Flex,
  AlertIcon,
  SlideFade,
} from '@chakra-ui/react'
import React, { useEffect } from 'react'
import { useState } from 'react'
import {
  ClientSafeProvider,
  getProviders,
  LiteralUnion,
  useSession,
} from 'next-auth/react'
import { IFrameLoginButtons } from './IFrameLoginButtons'
import { useRouter } from 'next/router'
import { BuiltInProviderType } from 'next-auth/providers'
import { useToast } from '@/hooks/useToast'
import { TextLink } from '@/components/TextLink'
import { SignInError } from './SignInError'
import { useTranslate } from '@tolgee/react'
import { sanitizeUrl } from '@braintree/sanitize-url'

export const IFrameForm = () => {
  const { t } = useTranslate()
  const router = useRouter()
  const { status } = useSession()
  const [isLoadingProviders, setIsLoadingProviders] = useState(true)

  const [isMagicLinkSent] = useState(false)

  const { showToast } = useToast()
  const [providers, setProviders] =
    useState<
      Record<LiteralUnion<BuiltInProviderType, string>, ClientSafeProvider>
    >()

  const hasNoAuthProvider =
    !isLoadingProviders && Object.keys(providers ?? {}).length === 0

  useEffect(() => {
    if (status === 'authenticated') {
      const redirectPath = router.query.redirectPath?.toString()
      router.replace(redirectPath ? sanitizeUrl(redirectPath) : '/mozbots')
      return
    }
    ;(async () => {
      const providers = await getProviders()
      setProviders(providers ?? undefined)
      setIsLoadingProviders(false)
    })()
  }, [status, router])

  useEffect(() => {
    if (!router.isReady) return
    if (router.query.error === 'ip-banned') {
      showToast({
        status: 'info',
        description:
          'Your account has suspicious activity and is being reviewed by our team. Feel free to contact us.',
      })
    }
  }, [router.isReady, router.query.error, showToast])

  if (isLoadingProviders) return <Spinner />
  if (hasNoAuthProvider)
    return (
      <Text>
        {t('auth.noProvider.preLink')}{' '}
        <TextLink
          href="https://mozdocs.mozartfintech.com/self-hosting/configuration"
          isExternal
        >
          {t('auth.noProvider.link')}
        </TextLink>
      </Text>
    )
  return (
    <Stack spacing="4" w="330px">
      {!isMagicLinkSent && (
        <>
          <IFrameLoginButtons providers={providers} />
        </>
      )}
      {router.query.error && (
        <SignInError error={router.query.error.toString()} />
      )}
      <SlideFade offsetY="20px" in={isMagicLinkSent} unmountOnExit>
        <Flex>
          <Alert status="success" w="100%">
            <HStack>
              <AlertIcon />
              <Stack spacing={1}>
                <Text fontWeight="semibold">{t('auth.magicLink.title')}</Text>
                <Text fontSize="sm">{t('auth.magicLink.description')}</Text>
              </Stack>
            </HStack>
          </Alert>
        </Flex>
      </SlideFade>
    </Stack>
  )
}
