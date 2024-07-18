import { trpc } from '@/lib/trpc'

export const useMozbots = ({
  folderId,
  workspaceId,
  onError,
}: {
  workspaceId?: string
  folderId?: string | 'root'
  onError: (error: Error) => void
}) => {
  const { data, isLoading, refetch } = trpc.mozbot.listMozbots.useQuery(
    {
      workspaceId: workspaceId as string,
      folderId,
    },
    {
      enabled: !!workspaceId,
      onError: (error) => {
        onError(new Error(error.message))
      },
    }
  )
  return {
    mozbots: data?.mozbots,
    isLoading,
    refetch,
  }
}
