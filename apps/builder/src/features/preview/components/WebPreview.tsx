import { ThunderIcon } from '@/components/icons'
import { useUser } from '@/features/account/hooks/useUser'
import { useEditor } from '@/features/editor/providers/EditorProvider'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { useGraph } from '@/features/graph/providers/GraphProvider'
import { useToast } from '@/hooks/useToast'
import { Standard } from '@mozbot.io/nextjs'
import { ContinueChatResponse } from '@mozbot.io/schemas'

export const WebPreview = () => {
  const { user } = useUser()
  const { mozbot } = useMozbot()
  const { startPreviewAtGroup, startPreviewAtEvent } = useEditor()
  const { setPreviewingBlock } = useGraph()

  const { showToast } = useToast()

  const handleNewLogs = (logs: ContinueChatResponse['logs']) => {
    logs?.forEach((log) => {
      showToast({
        icon: <ThunderIcon />,
        status: log.status as 'success' | 'error' | 'info',
        title: log.status === 'error' ? 'An error occured' : undefined,
        description: log.description,
        details: log.details
          ? {
              lang: 'json',
              content:
                typeof log.details === 'string'
                  ? log.details
                  : JSON.stringify(log.details, null, 2),
            }
          : undefined,
      })
      if (log.status === 'error') console.error(log)
    })
  }

  if (!mozbot) return null

  return (
    <Standard
      key={`web-preview${startPreviewAtGroup ?? ''}`}
      mozbot={mozbot}
      sessionId={user ? `${mozbot.id}-${user.id}` : undefined}
      startFrom={
        startPreviewAtGroup
          ? { type: 'group', groupId: startPreviewAtGroup }
          : startPreviewAtEvent
          ? { type: 'event', eventId: startPreviewAtEvent }
          : undefined
      }
      onNewInputBlock={(block) =>
        setPreviewingBlock({
          id: block.id,
          groupId:
            mozbot.groups.find((g) => g.blocks.some((b) => b.id === block.id))
              ?.id ?? '',
        })
      }
      onNewLogs={handleNewLogs}
      style={{
        borderWidth: '1px',
        borderRadius: '0.25rem',
      }}
    />
  )
}
