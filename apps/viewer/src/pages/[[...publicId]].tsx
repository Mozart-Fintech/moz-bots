import { IncomingMessage } from 'http'
import { ErrorPage } from '@/components/ErrorPage'
import { NotFoundPage } from '@/components/NotFoundPage'
import { GetServerSideProps, GetServerSidePropsContext } from 'next'
import { isNotDefined } from '@mozbot.io/lib'
import { MozbotPageProps, MozbotPageV2 } from '@/components/MozbotPageV2'
import { MozbotPageV3, MozbotV3PageProps } from '@/components/MozbotPageV3'
import { env } from '@mozbot.io/env'
import prisma from '@mozbot.io/lib/prisma'
import { defaultSettings } from '@mozbot.io/schemas/features/mozbot/settings/constants'
import {
  defaultBackgroundColor,
  defaultBackgroundType,
} from '@mozbot.io/schemas/features/mozbot/theme/constants'

// Browsers that doesn't support ES modules and/or web components
const incompatibleBrowsers = [
  {
    name: 'UC Browser',
    regex: /ucbrowser/i,
  },
  {
    name: 'Internet Explorer',
    regex: /msie|trident/i,
  },
  {
    name: 'Opera Mini',
    regex: /opera mini/i,
  },
]

const log = (message: string) => {
  if (!env.DEBUG) return
  console.log(`[DEBUG] ${message}`)
}

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const incompatibleBrowser =
    incompatibleBrowsers.find((browser) =>
      browser.regex.test(context.req.headers['user-agent'] ?? '')
    )?.name ?? null
  const pathname = context.resolvedUrl.split('?')[0]
  const { host, forwardedHost } = getHost(context.req)
  log(`host: ${host}`)
  log(`forwardedHost: ${forwardedHost}`)
  const protocol =
    context.req.headers['x-forwarded-proto'] === 'https' ||
      (context.req.socket as unknown as { encrypted: boolean }).encrypted
      ? 'https'
      : 'http'

  log(`Request protocol: ${protocol}`)
  try {
    if (!host) return { props: {} }
    const viewerUrls = env.NEXT_PUBLIC_VIEWER_URL
    log(`viewerUrls: ${viewerUrls}`)
    const isMatchingViewerUrl = env.NEXT_PUBLIC_E2E_TEST
      ? true
      : viewerUrls.some(
        (url) =>
          host.split(':')[0].includes(url.split('//')[1].split(':')[0]) ||
          (forwardedHost &&
            forwardedHost
              .split(':')[0]
              .includes(url.split('//')[1].split(':')[0]))
      )
    log(`isMatchingViewerUrl: ${isMatchingViewerUrl}`)
    const customDomain = `${forwardedHost ?? host}${pathname === '/' ? '' : pathname
      }`
    const publishedMozbot = isMatchingViewerUrl
      ? await getMozbotFromPublicId(context.query.publicId?.toString())
      : await getMozbotFromCustomDomain(customDomain)

    return {
      props: {
        publishedMozbot,
        incompatibleBrowser,
        isMatchingViewerUrl,
        url: `${protocol}://${forwardedHost ?? host}${pathname}`,
      },
    }
  } catch (err) {
    console.error(err)
  }
  return {
    props: {
      incompatibleBrowser,
      url: `${protocol}://${forwardedHost ?? host}${pathname}`,
    },
  }
}

const getMozbotFromPublicId = async (publicId?: string) => {
  const publishedMozbot = (await prisma.publicMozbot.findFirst({
    where: { mozbot: { publicId: publicId ?? '' } },
    select: {
      variables: true,
      settings: true,
      theme: true,
      version: true,
      groups: true,
      edges: true,
      mozbotId: true,
      id: true,
      mozbot: {
        select: {
          name: true,
          isClosed: true,
          isArchived: true,
          publicId: true,
        },
      },
    },
  })) as MozbotPageProps['publishedMozbot'] | null
  if (isNotDefined(publishedMozbot)) return null
  return publishedMozbot.version
    ? ({
      name: publishedMozbot.mozbot.name,
      publicId: publishedMozbot.mozbot.publicId ?? null,
      background: publishedMozbot.theme.general?.background ?? {
        type: defaultBackgroundType,
        content: defaultBackgroundColor,
      },
      isHideQueryParamsEnabled:
        publishedMozbot.settings.general?.isHideQueryParamsEnabled ??
        defaultSettings.general.isHideQueryParamsEnabled,
      metadata: publishedMozbot.settings.metadata ?? {},
      font: publishedMozbot.theme.general?.font ?? null,
    } satisfies Pick<
      MozbotV3PageProps,
      | 'name'
      | 'publicId'
      | 'background'
      | 'isHideQueryParamsEnabled'
      | 'metadata'
      | 'font'
    >)
    : publishedMozbot
}

const getMozbotFromCustomDomain = async (customDomain: string) => {
  const publishedMozbot = (await prisma.publicMozbot.findFirst({
    where: { mozbot: { customDomain } },
    select: {
      variables: true,
      settings: true,
      theme: true,
      version: true,
      groups: true,
      edges: true,
      mozbotId: true,
      id: true,
      mozbot: {
        select: {
          name: true,
          isClosed: true,
          isArchived: true,
          publicId: true,
        },
      },
    },
  })) as MozbotPageProps['publishedMozbot'] | null
  if (isNotDefined(publishedMozbot)) return null
  return publishedMozbot.version
    ? ({
      name: publishedMozbot.mozbot.name,
      publicId: publishedMozbot.mozbot.publicId ?? null,
      background: publishedMozbot.theme.general?.background ?? {
        type: defaultBackgroundType,
        content: defaultBackgroundColor,
      },
      isHideQueryParamsEnabled:
        publishedMozbot.settings.general?.isHideQueryParamsEnabled ??
        defaultSettings.general.isHideQueryParamsEnabled,
      metadata: publishedMozbot.settings.metadata ?? {},
      font: publishedMozbot.theme.general?.font ?? null,
    } satisfies Pick<
      MozbotV3PageProps,
      | 'name'
      | 'publicId'
      | 'background'
      | 'isHideQueryParamsEnabled'
      | 'metadata'
      | 'font'
    >)
    : publishedMozbot
}

const getHost = (
  req?: IncomingMessage
): { host?: string; forwardedHost?: string } => ({
  host: req?.headers ? req.headers.host : window.location.host,
  forwardedHost: req?.headers['x-forwarded-host'] as string | undefined,
})

const App = ({
  publishedMozbot,
  incompatibleBrowser,
  ...props
}: {
  isIE: boolean
  customHeadCode: string | null
  url: string
  isMatchingViewerUrl?: boolean
  publishedMozbot:
  | MozbotPageProps['publishedMozbot']
  | Pick<
    MozbotV3PageProps,
    | 'name'
    | 'publicId'
    | 'background'
    | 'isHideQueryParamsEnabled'
    | 'metadata'
    | 'font'
  >
  incompatibleBrowser: string | null
}) => {
  if (incompatibleBrowser)
    return (
      <ErrorPage
        error={
          new Error(
            `Your web browser: ${incompatibleBrowser}, is not supported.`
          )
        }
      />
    )
  if (
    !publishedMozbot ||
    ('mozbot' in publishedMozbot && publishedMozbot.mozbot.isArchived)
  )
    return <NotFoundPage />
  if ('mozbot' in publishedMozbot && publishedMozbot.mozbot.isClosed)
    return <ErrorPage error={new Error('This bot is now closed')} />
  return 'mozbot' in publishedMozbot ? (
    <MozbotPageV2 publishedMozbot={publishedMozbot} {...props} />
  ) : (
    <MozbotPageV3
      url={props.url}
      isMatchingViewerUrl={props.isMatchingViewerUrl}
      name={publishedMozbot.name}
      publicId={publishedMozbot.publicId}
      isHideQueryParamsEnabled={
        publishedMozbot.isHideQueryParamsEnabled ??
        defaultSettings.general.isHideQueryParamsEnabled
      }
      background={
        publishedMozbot.background ?? {
          type: defaultBackgroundType,
          content: defaultBackgroundColor,
        }
      }
      metadata={publishedMozbot.metadata ?? {}}
      font={publishedMozbot.font}
    />
  )
}

export default App
