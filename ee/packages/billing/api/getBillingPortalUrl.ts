import { TRPCError } from '@trpc/server'
import { isAdminWriteWorkspaceForbidden } from '@mozbot.io/db-rules/isAdminWriteWorkspaceForbidden'
import { env } from '@mozbot.io/env'
import prisma from '@mozbot.io/lib/prisma'
import { User } from '@mozbot.io/prisma'
import Stripe from 'stripe'

type Props = {
  workspaceId: string
  user: Pick<User, 'email' | 'id'>
}
export const getBillingPortalUrl = async ({ workspaceId, user }: Props) => {
  if (!env.STRIPE_SECRET_KEY)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'STRIPE_SECRET_KEY var is missing',
    })
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
    },
    select: {
      stripeId: true,
      members: {
        select: {
          userId: true,
          role: true,
        },
      },
    },
  })
  if (!workspace?.stripeId || isAdminWriteWorkspaceForbidden(workspace, user))
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Workspace not found',
    })
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2022-11-15',
  })
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: workspace.stripeId,
    return_url: `${env.NEXTAUTH_URL}/mozbots`,
  })
  return {
    billingPortalUrl: portalSession.url,
  }
}
