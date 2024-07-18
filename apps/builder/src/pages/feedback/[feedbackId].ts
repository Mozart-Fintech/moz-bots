import { getServerSession } from 'next-auth'
import { User } from '@mozbot.io/prisma'
import { isNotDefined } from '@mozbot.io/lib'
import { sign } from 'jsonwebtoken'
import { getAuthOptions } from '../api/auth/[...nextauth]'
import { GetServerSidePropsContext } from 'next'
import { env } from '@mozbot.io/env'

export default function Page() {
  return null
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(
    context.req,
    context.res,
    getAuthOptions({})
  )
  const feedbackId = context.query.feedbackId?.toString() as string
  if (isNotDefined(session?.user))
    return {
      redirect: {
        permanent: false,
        destination: `/signin?redirectPath=%2Ffeedback%2F${feedbackId}`,
      },
    }
  const sleekplanToken = createSSOToken(session?.user as User)
  return {
    redirect: {
      permanent: false,
      destination: `https://feedback.mozbot.io/feedback/${feedbackId}/?sso=${sleekplanToken}`,
    },
  }
}

const createSSOToken = (user: User) => {
  if (!env.SLEEKPLAN_SSO_KEY) return
  const userData = {
    mail: user.email,
    id: user.id,
    name: user.name,
    img: user.image,
  }

  return sign(userData, env.SLEEKPLAN_SSO_KEY, { algorithm: 'HS256' })
}
