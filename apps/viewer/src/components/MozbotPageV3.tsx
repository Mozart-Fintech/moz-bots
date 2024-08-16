import { Standard } from '@mozbot.io/nextjs'
import { useRouter } from 'next/router'
import { SEO } from './Seo'
import { Mozbot } from '@mozbot.io/schemas/features/mozbot/mozbot'
import { BackgroundType } from '@mozbot.io/schemas/features/mozbot/theme/constants'
import { defaultSettings } from '@mozbot.io/schemas/features/mozbot/settings/constants'
import { Font } from '@mozbot.io/schemas'
import { useMemo } from 'react'

export type MozbotV3PageProps = {
  url: string
  isMatchingViewerUrl?: boolean
  name: string
  publicId: string | null
  font: Font | null
  isHideQueryParamsEnabled: boolean | null
  background: NonNullable<Mozbot['theme']['general']>['background']
  metadata: Mozbot['settings']['metadata']
}

export const MozbotPageV3 = ({
  font,
  isMatchingViewerUrl,
  publicId,
  name,
  url,
  isHideQueryParamsEnabled,
  metadata,
  background,
}: MozbotV3PageProps) => {
  const { asPath, push } = useRouter()

  const clearQueryParamsIfNecessary = () => {
    const hasQueryParams = asPath.includes('?')
    if (
      !hasQueryParams ||
      !(
        isHideQueryParamsEnabled ??
        defaultSettings.general.isHideQueryParamsEnabled
      )
    )
      return
    push(asPath.split('?')[0], undefined, { shallow: true })
  }

  const apiOrigin = useMemo(() => {
    if (isMatchingViewerUrl) return
    return new URL(url).origin
  }, [isMatchingViewerUrl, url])

  return (
    <div
      style={{
        height: '100vh',
        // Set background color to avoid SSR flash
        backgroundColor:
          background?.type === BackgroundType.COLOR
            ? background?.content
            : background?.type === BackgroundType.NONE
            ? undefined
            : '#fff',
      }}
    >
      <SEO url={url} mozbotName={name} metadata={metadata} />
      <Standard
        mozbot={publicId}
        onInit={clearQueryParamsIfNecessary}
        font={font ?? undefined}
        apiHost={apiOrigin}
      />
    </div>
  )
}
