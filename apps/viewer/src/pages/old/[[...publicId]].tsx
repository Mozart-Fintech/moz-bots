import { IncomingMessage } from 'http'
import { ErrorPage } from '@/components/ErrorPage'
import { NotFoundPage } from '@/components/NotFoundPage'
import { GetServerSideProps, GetServerSidePropsContext } from 'next'
import { isDefined, isNotDefined, omit } from '@mozbot.io/lib'
import { MozbotPageProps, MozbotPageV2 } from '@/components/MozbotPageV2'
import prisma from '@mozbot.io/lib/prisma'

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const pathname = context.resolvedUrl.split('?')[0]
  const { host, forwardedHost } = getHost(context.req)
  try {
    if (!host) return { props: {} }
    const publishedMozbot = await getMozbotFromPublicId(
      context.query.publicId?.toString()
    )
    const headCode = publishedMozbot?.settings.metadata?.customHeadCode
    return {
      props: {
        publishedMozbot,
        url: `https://${forwardedHost ?? host}${pathname}`,
        customHeadCode:
          isDefined(headCode) && headCode !== '' ? headCode : null,
      },
    }
  } catch (err) {
    console.error(err)
  }
  return {
    props: {
      url: `https://${forwardedHost ?? host}${pathname}`,
    },
  }
}

const getMozbotFromPublicId = async (
  publicId?: string
): Promise<MozbotPageProps['publishedMozbot'] | null> => {
  const publishedMozbot = await prisma.publicMozbot.findFirst({
    where: { mozbot: { publicId: publicId ?? '' } },
    include: {
      mozbot: { select: { name: true, isClosed: true, isArchived: true } },
    },
  })
  if (isNotDefined(publishedMozbot)) return null
  return omit(
    publishedMozbot,
    'createdAt',
    'updatedAt'
  ) as MozbotPageProps['publishedMozbot']
}

const getHost = (
  req?: IncomingMessage
): { host?: string; forwardedHost?: string } => ({
  host: req?.headers ? req.headers.host : window.location.host,
  forwardedHost: req?.headers['x-forwarded-host'] as string | undefined,
})

const App = ({ publishedMozbot, ...props }: MozbotPageProps) => {
  if (!publishedMozbot || publishedMozbot.mozbot.isArchived)
    return <NotFoundPage />
  if (publishedMozbot.mozbot.isClosed)
    return <ErrorPage error={new Error('This bot is now closed')} />
  return <MozbotPageV2 publishedMozbot={publishedMozbot} {...props} />
}

export default App
