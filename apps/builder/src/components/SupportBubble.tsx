import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { useUser } from '@/features/account/hooks/useUser'
import { useWorkspace } from '@/features/workspace/WorkspaceProvider'
import React, { useEffect, useState } from 'react'
import { Bubble, BubbleProps } from '@mozbot.io/nextjs'
import { planToReadable } from '@/features/billing/helpers/planToReadable'
import { Plan } from '@mozbot.io/prisma'

export const SupportBubble = (props: Omit<BubbleProps, 'mozbot'>) => {
  const { mozbot } = useMozbot()
  const { user } = useUser()
  const { workspace } = useWorkspace()

  const [lastViewedmozbotId, setLastViewedmozbotId] = useState(mozbot?.id)

  useEffect(() => {
    if (!mozbot?.id) return
    if (lastViewedmozbotId === mozbot?.id) return
    setLastViewedmozbotId(mozbot?.id)
  }, [lastViewedmozbotId, mozbot?.id])

  if (!workspace?.plan || workspace.plan === Plan.FREE) return null

  return (
    <Bubble
      mozbot="mozbot-support"
      prefilledVariables={{
        'User ID': user?.id,
        'First name': user?.name?.split(' ')[0] ?? undefined,
        Email: user?.email ?? undefined,
        'Mozbot ID': lastViewedmozbotId,
        'Avatar URL': user?.image ?? undefined,
        Plan: planToReadable(workspace?.plan),
      }}
      theme={{
        chatWindow: {
          backgroundColor: '#fff',
        },
      }}
      {...props}
    />
  )
}
