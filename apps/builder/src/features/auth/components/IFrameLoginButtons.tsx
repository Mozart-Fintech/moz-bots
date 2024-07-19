import { Stack, Spinner } from '@chakra-ui/react'
import { LiteralUnion, signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { stringify } from 'qs'
import { BuiltInProviderType } from 'next-auth/providers'
import { omit } from '@mozbot.io/lib'

export const IFrameLoginButtons = () => {
  const { query } = useRouter()
  const { status } = useSession()
  const [authLoading, setAuthLoading] =
    useState<LiteralUnion<BuiltInProviderType, string>>()

  const handleSignIn = async () => {
    const provider = 'auth0'
    setAuthLoading(provider)
    await signIn(provider, {
      callbackUrl:
        query.callbackUrl?.toString() ??
        `/mozbots?${stringify(omit(query, 'error', 'callbackUrl'))}`,
    })
    setTimeout(() => setAuthLoading(undefined), 3000)
  }

  const handleAuth0Click = () => handleSignIn()

  useEffect(() => {
    if (
      ['loading', 'authenticated'].includes(status) ||
      authLoading === 'auth0'
    )
      handleAuth0Click()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, status])

  return (
    <Stack>
      <Spinner />
    </Stack>
  )
}
