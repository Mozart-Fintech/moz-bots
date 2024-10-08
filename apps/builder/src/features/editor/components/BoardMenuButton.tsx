import {
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  StackProps,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import assert from 'assert'
import {
  BookIcon,
  BracesIcon,
  DownloadIcon,
  MoreVerticalIcon,
  SettingsIcon,
} from '@/components/icons'
import { useMozbot } from '../providers/MozbotProvider'
import React, { useState } from 'react'
import { EditorSettingsModal } from './EditorSettingsModal'
import { parseDefaultPublicId } from '@/features/publish/helpers/parseDefaultPublicId'
import { useTranslate } from '@tolgee/react'
import { RightPanel, useEditor } from '../providers/EditorProvider'

export const BoardMenuButton = (props: StackProps) => {
  const { mozbot, currentUserMode } = useMozbot()
  const [isDownloading, setIsDownloading] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { t } = useTranslate()
  const { setRightPanel } = useEditor()

  const downloadFlow = () => {
    assert(mozbot)
    setIsDownloading(true)
    const data =
      'data:application/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(mozbot))
    const fileName = `mozbot-export-${parseDefaultPublicId(
      mozbot.name,
      mozbot.id
    )}.json`
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', data)
    linkElement.setAttribute('download', fileName)
    linkElement.click()
    setIsDownloading(false)
  }

  const redirectToDocumentation = () =>
    window.open('https://mozdocs.mozartfintech.com/editor/graph', '_blank')

  return (
    <HStack rounded="md" spacing="4" {...props}>
      <IconButton
        icon={<BracesIcon />}
        aria-label="Open variables drawer"
        size="sm"
        shadow="lg"
        bgColor={useColorModeValue('white', undefined)}
        onClick={() => setRightPanel(RightPanel.VARIABLES)}
      />
      <Menu>
        <MenuButton
          as={IconButton}
          icon={<MoreVerticalIcon transform={'rotate(90deg)'} />}
          isLoading={isDownloading}
          size="sm"
          shadow="lg"
          bgColor={useColorModeValue('white', undefined)}
        />
        <MenuList>
          <MenuItem icon={<BookIcon />} onClick={redirectToDocumentation}>
            {t('editor.graph.menu.documentationItem.label')}
          </MenuItem>
          <MenuItem icon={<SettingsIcon />} onClick={onOpen}>
            {t('editor.graph.menu.editorSettingsItem.label')}
          </MenuItem>
          {currentUserMode !== 'guest' ? (
            <MenuItem icon={<DownloadIcon />} onClick={downloadFlow}>
              {t('editor.graph.menu.exportFlowItem.label')}
            </MenuItem>
          ) : null}
        </MenuList>
        <EditorSettingsModal isOpen={isOpen} onClose={onClose} />
      </Menu>
    </HStack>
  )
}
