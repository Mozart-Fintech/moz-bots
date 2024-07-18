import { getAuthOptions } from '@/pages/api/auth/[...nextauth]'
import prisma from '@mozbot.io/lib/prisma'
import { trackEvents } from '@mozbot.io/telemetry/trackEvents'
import { User } from '@mozbot.io/schemas'
import { GetServerSidePropsContext } from 'next'
import { getServerSession } from 'next-auth'

export const trackAnalyticsPageView = async (
  context: GetServerSidePropsContext
) => {
  const mozbotId = context.params?.mozbotId as string | undefined
  if (!mozbotId) return
  const mozbot = await prisma.mozbot.findUnique({
    where: { id: mozbotId },
    select: { workspaceId: true },
  })
  if (!mozbot) return
  const session = await getServerSession(
    context.req,
    context.res,
    getAuthOptions({})
  )
  await trackEvents([
    {
      name: 'Analytics visited',
      mozbotId,
      userId: (session?.user as User).id,
      workspaceId: mozbot.workspaceId,
    },
  ])
}
