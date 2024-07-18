import { fetcher } from '@/helpers/fetcher'
import { Invitation } from '@mozbot.io/prisma'
import useSWR from 'swr'
import { env } from '@mozbot.io/env'

export const useInvitations = ({
  mozbotId,
  onError,
}: {
  mozbotId?: string
  onError: (error: Error) => void
}) => {
  const { data, error, mutate } = useSWR<{ invitations: Invitation[] }, Error>(
    mozbotId ? `/api/mozbots/${mozbotId}/invitations` : null,
    fetcher,
    {
      dedupingInterval: env.NEXT_PUBLIC_E2E_TEST ? 0 : undefined,
    }
  )
  if (error) onError(error)
  return {
    invitations: data?.invitations,
    isLoading: !error && !data,
    mutate,
  }
}
