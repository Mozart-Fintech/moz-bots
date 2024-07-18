import { ImageUploadContent } from '@/components/ImageUploadContent'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import {
  Flex,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Text,
  Image,
  Button,
  Portal,
} from '@chakra-ui/react'
import { isNotEmpty } from '@mozbot.io/lib'
import { Background } from '@mozbot.io/schemas'
import React from 'react'
import { ColorPicker } from '../../../../components/ColorPicker'
import {
  BackgroundType,
  defaultBackgroundColor,
  defaultBackgroundType,
} from '@mozbot.io/schemas/features/mozbot/theme/constants'
import { useTranslate } from '@tolgee/react'

type BackgroundContentProps = {
  background?: Background
  onBackgroundContentChange: (content: string) => void
}

export const BackgroundContent = ({
  background,
  onBackgroundContentChange,
}: BackgroundContentProps) => {
  const { t } = useTranslate()
  const { mozbot } = useMozbot()
  const handleContentChange = (content: string) =>
    onBackgroundContentChange(content)

  if ((background?.type ?? defaultBackgroundType) === BackgroundType.IMAGE) {
    if (!mozbot) return null
    return (
      <Popover isLazy placement="top">
        <PopoverTrigger>
          {isNotEmpty(background?.content) ? (
            <Image
              src={background?.content}
              alt={t('theme.sideMenu.global.background.image.alt')}
              cursor="pointer"
              _hover={{ filter: 'brightness(.9)' }}
              transition="filter 200ms"
              rounded="md"
              maxH="200px"
              objectFit="cover"
            />
          ) : (
            <Button>
              {t('theme.sideMenu.global.background.image.button')}
            </Button>
          )}
        </PopoverTrigger>
        <Portal>
          <PopoverContent p="4" w="500px">
            <ImageUploadContent
              uploadFileProps={{
                workspaceId: mozbot.workspaceId,
                mozbotId: mozbot.id,
                fileName: 'background',
              }}
              defaultUrl={background?.content}
              onSubmit={handleContentChange}
              excludedTabs={['giphy', 'icon']}
            />
          </PopoverContent>
        </Portal>
      </Popover>
    )
  }
  if ((background?.type ?? defaultBackgroundType) === BackgroundType.COLOR) {
    return (
      <Flex justify="space-between" align="center">
        <Text>{t('theme.sideMenu.global.background.color')}</Text>
        <ColorPicker
          value={background?.content ?? defaultBackgroundColor}
          onColorChange={handleContentChange}
        />
      </Flex>
    )
  }
  return null
}
