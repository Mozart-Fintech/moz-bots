import {
  PublicMozbot,
  PublicMozbotV6,
  MozbotV6,
  mozbotV6Schema,
} from '@mozbot.io/schemas'
import { Router } from 'next/router'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { isDefined, omit } from '@mozbot.io/lib'
import { edgesAction, EdgesActions } from './mozbotActions/edges'
import { itemsAction, ItemsActions } from './mozbotActions/items'
import { GroupsActions, groupsActions } from './mozbotActions/groups'
import { blocksAction, BlocksActions } from './mozbotActions/blocks'
import { variablesAction, VariablesActions } from './mozbotActions/variables'
import { dequal } from 'dequal'
import { useToast } from '@/hooks/useToast'
import { useUndo } from '../hooks/useUndo'
import { useAutoSave } from '@/hooks/useAutoSave'
import { preventUserFromRefreshing } from '@/helpers/preventUserFromRefreshing'
import { areMozbotsEqual } from '@/features/publish/helpers/areMozbotsEqual'
import { isPublished as isPublishedHelper } from '@/features/publish/helpers/isPublished'
import { convertPublicMozbotToMozbot } from '@/features/publish/helpers/convertPublicMozbotToMozbot'
import { trpc } from '@/lib/trpc'
import { EventsActions, eventsActions } from './mozbotActions/events'
import { useGroupsStore } from '@/features/graph/hooks/useGroupsStore'

const autoSaveTimeout = 15000

type UpdateMozbotPayload = Partial<
  Pick<
    MozbotV6,
    | 'theme'
    | 'selectedThemeTemplateId'
    | 'settings'
    | 'publicId'
    | 'name'
    | 'icon'
    | 'customDomain'
    | 'resultsTablePreferences'
    | 'isClosed'
    | 'whatsAppCredentialsId'
    | 'riskLevel'
  >
>

export type SetMozbot = (
  newPresent: MozbotV6 | ((current: MozbotV6) => MozbotV6)
) => void

const mozbotContext = createContext<
  {
    mozbot?: MozbotV6
    publishedMozbot?: PublicMozbotV6
    publishedMozbotVersion?: PublicMozbot['version']
    currentUserMode: 'guest' | 'read' | 'write'
    is404: boolean
    isPublished: boolean
    isSavingLoading: boolean
    save: (updates?: Partial<MozbotV6>, overwrite?: boolean) => Promise<void>
    undo: () => void
    redo: () => void
    canRedo: boolean
    canUndo: boolean
    updateMozbot: (props: {
      updates: UpdateMozbotPayload
      save?: boolean
      overwrite?: boolean
    }) => Promise<MozbotV6 | undefined>
    restorePublishedMozbot: () => void
  } & GroupsActions &
  BlocksActions &
  ItemsActions &
  VariablesActions &
  EdgesActions &
  EventsActions
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
>({})

export const MozbotProvider = ({
  children,
  mozbotId,
}: {
  children: ReactNode
  mozbotId?: string
}) => {
  const { showToast } = useToast()
  const [is404, setIs404] = useState(false)
  const setGroupsCoordinates = useGroupsStore(
    (state) => state.setGroupsCoordinates
  )

  const {
    data: mozbotData,
    isLoading: isFetchingMozbot,
    refetch: refetchMozbot,
  } = trpc.mozbot.getMozbot.useQuery(
    { mozbotId: mozbotId as string, migrateToLatestVersion: true },
    {
      enabled: isDefined(mozbotId),
      retry: 0,
      onError: (error) => {
        if (error.data?.httpStatus === 404) {
          setIs404(true)
          return
        }
        setIs404(false)
        showToast({
          title: 'Could not fetch mozbot',
          description: error.message,
          details: {
            content: JSON.stringify(error.data?.zodError?.fieldErrors, null, 2),
            lang: 'json',
          },
        })
      },
      onSuccess: () => {
        setIs404(false)
      },
    }
  )

  const { data: publishedMozbotData } =
    trpc.mozbot.getPublishedMozbot.useQuery(
      { mozbotId: mozbotId as string, migrateToLatestVersion: true },
      {
        enabled:
          isDefined(mozbotId) &&
          (mozbotData?.currentUserMode === 'read' ||
            mozbotData?.currentUserMode === 'write'),
        onError: (error) => {
          showToast({
            title: 'Could not fetch published mozbot',
            description: error.message,
            details: {
              content: JSON.stringify(
                error.data?.zodError?.fieldErrors,
                null,
                2
              ),
              lang: 'json',
            },
          })
        },
      }
    )

  const { mutateAsync: updateMozbot, isLoading: isSaving } =
    trpc.mozbot.updateMozbot.useMutation({
      onError: (error) =>
        showToast({
          title: 'Error while updating mozbot',
          description: error.message,
        }),
      onSuccess: () => {
        if (!mozbotId) return
        refetchMozbot()
      },
    })

  const mozbot = mozbotData?.mozbot as MozbotV6
  const publishedMozbot = (publishedMozbotData?.publishedMozbot ??
    undefined) as PublicMozbotV6 | undefined
  const isReadOnly =
    mozbotData &&
    ['read', 'guest'].includes(mozbotData?.currentUserMode ?? 'guest')

  const [
    localMozbot,
    {
      redo,
      undo,
      flush,
      canRedo,
      canUndo,
      set: setLocalMozbot,
      setUpdateDate,
    },
  ] = useUndo<MozbotV6>(undefined, {
    isReadOnly,
    onUndo: (t) => {
      setGroupsCoordinates(t.groups)
    },
    onRedo: (t) => {
      setGroupsCoordinates(t.groups)
    },
  })

  useEffect(() => {
    if (!mozbot && isDefined(localMozbot)) {
      setLocalMozbot(undefined)
      setGroupsCoordinates(undefined)
    }
    if (isFetchingMozbot || !mozbot) return
    if (
      mozbot.id !== localMozbot?.id ||
      new Date(mozbot.updatedAt).getTime() >
      new Date(localMozbot.updatedAt).getTime()
    ) {
      setLocalMozbot({ ...mozbot })
      setGroupsCoordinates(mozbot.groups)
      flush()
    }
  }, [
    flush,
    isFetchingMozbot,
    localMozbot,
    setGroupsCoordinates,
    setLocalMozbot,
    showToast,
    mozbot,
  ])

  const saveMozbot = useCallback(
    async (updates?: Partial<MozbotV6>, overwrite?: boolean) => {
      if (!localMozbot || !mozbot || isReadOnly) return
      const mozbotToSave = {
        ...localMozbot,
        ...updates,
      }
      if (
        dequal(
          JSON.parse(JSON.stringify(omit(mozbot, 'updatedAt'))),
          JSON.parse(JSON.stringify(omit(mozbotToSave, 'updatedAt')))
        )
      )
        return
      const newParsedMozbot = mozbotV6Schema.parse({ ...mozbotToSave })
      setLocalMozbot(newParsedMozbot)
      try {
        const { mozbot } = await updateMozbot({
          mozbotId: newParsedMozbot.id,
          mozbot: newParsedMozbot,
        })
        setUpdateDate(mozbot.updatedAt)
        if (overwrite) {
          setLocalMozbot(mozbot)
        }
      } catch {
        setLocalMozbot({
          ...localMozbot,
        })
      }
    },
    [
      isReadOnly,
      localMozbot,
      setLocalMozbot,
      setUpdateDate,
      mozbot,
      updateMozbot,
    ]
  )

  useAutoSave(
    {
      handler: saveMozbot,
      item: localMozbot,
      debounceTimeout: autoSaveTimeout,
    },
    [saveMozbot, localMozbot]
  )

  useEffect(() => {
    const handleSaveMozbot = () => {
      saveMozbot()
    }
    Router.events.on('routeChangeStart', handleSaveMozbot)
    return () => {
      Router.events.off('routeChangeStart', handleSaveMozbot)
    }
  }, [saveMozbot])

  const isPublished = useMemo(
    () =>
      isDefined(localMozbot) &&
      isDefined(localMozbot.publicId) &&
      isDefined(publishedMozbot) &&
      isPublishedHelper(localMozbot, publishedMozbot),
    [localMozbot, publishedMozbot]
  )

  useEffect(() => {
    if (!localMozbot || !mozbot || isReadOnly) return
    if (!areMozbotsEqual(localMozbot, mozbot)) {
      window.addEventListener('beforeunload', preventUserFromRefreshing)
    }

    return () => {
      window.removeEventListener('beforeunload', preventUserFromRefreshing)
    }
  }, [localMozbot, mozbot, isReadOnly])

  const updateLocalMozbot = async ({
    updates,
    save,
    overwrite,
  }: {
    updates: UpdateMozbotPayload
    save?: boolean
    overwrite?: boolean
  }) => {
    if (!localMozbot || isReadOnly) return
    const newMozbot = { ...localMozbot, ...updates }
    setLocalMozbot(newMozbot)
    if (save) await saveMozbot(newMozbot, overwrite)
    return newMozbot
  }

  const restorePublishedMozbot = () => {
    if (!publishedMozbot || !localMozbot) return
    setLocalMozbot(
      convertPublicMozbotToMozbot(publishedMozbot, localMozbot)
    )
  }

  return (
    <mozbotContext.Provider
      value={{
        mozbot: localMozbot,
        publishedMozbot,
        publishedMozbotVersion: publishedMozbotData?.version,
        currentUserMode: mozbotData?.currentUserMode ?? 'guest',
        isSavingLoading: isSaving,
        is404,
        save: saveMozbot,
        undo,
        redo,
        canUndo,
        canRedo,
        isPublished,
        updateMozbot: updateLocalMozbot,
        restorePublishedMozbot,
        ...groupsActions(setLocalMozbot as SetMozbot),
        ...blocksAction(setLocalMozbot as SetMozbot),
        ...variablesAction(setLocalMozbot as SetMozbot),
        ...edgesAction(setLocalMozbot as SetMozbot),
        ...itemsAction(setLocalMozbot as SetMozbot),
        ...eventsActions(setLocalMozbot as SetMozbot),
      }}
    >
      {children}
    </mozbotContext.Provider>
  )
}

export const useMozbot = () => useContext(mozbotContext)
