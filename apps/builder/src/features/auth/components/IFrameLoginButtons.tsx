import { Stack, Button } from '@chakra-ui/react'
import { ClientSafeProvider, LiteralUnion, useSession } from 'next-auth/react'
import React, { useEffect } from 'react'
import { BuiltInProviderType } from 'next-auth/providers'
import { useTranslate } from '@tolgee/react'
import router from 'next/router'
import { MozartLogo } from '@/components/logos/MozartLogo'

type Props = {
  providers:
    | Record<LiteralUnion<BuiltInProviderType, string>, ClientSafeProvider>
    | undefined
}

export const IFrameLoginButtons = ({ providers }: Props) => {
  const { t } = useTranslate()
  const { status } = useSession()

  const popupCenter = (url: string, title: string) => {
    const dualScreenLeft = window.screenLeft ?? window.screenX
    const dualScreenTop = window.screenTop ?? window.screenY

    const width =
      window.innerWidth ?? document.documentElement.clientWidth ?? screen.width

    const height =
      window.innerHeight ??
      document.documentElement.clientHeight ??
      screen.height

    const systemZoom = width / window.screen.availWidth

    const left = (width - 500) / 2 / systemZoom + dualScreenLeft
    const top = (height - 550) / 2 / systemZoom + dualScreenTop

    const newWindow = window.open(
      url,
      title,
      `width=${500 / systemZoom},height=${
        550 / systemZoom
      },top=${top},left=${left}`
    )

    newWindow?.focus()
  }

  const handleAuth0Click = () => popupCenter('/iframe-login', 'Login')

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/mozbots')
    }
  })

  return (
    <Stack>
      {providers?.auth0 && (
        <Button
          leftIcon={<MozartLogo />}
          onClick={handleAuth0Click}
          data-testid="auth0"
          isLoading={['loading', 'authenticated'].includes(status)}
          variant="outline"
        >
          {t('auth.socialLogin.mozartButton.label')}
        </Button>
      )}
    </Stack>
  )
}
