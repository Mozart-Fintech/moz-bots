import { useToast } from '@/hooks/useToast'
import { Button, ButtonProps, chakra } from '@chakra-ui/react'
import { Mozbot } from '@mozbot.io/schemas'
import React, { ChangeEvent } from 'react'
import { useTranslate } from '@tolgee/react'

type Props = {
  onNewMozbot: (mozbot: Mozbot) => void
} & ButtonProps

export const ImportMozbotFromFileButton = ({
  onNewMozbot,
  ...props
}: Props) => {
  const { t } = useTranslate()
  const { showToast } = useToast()

  const handleInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target?.files) return
    const file = e.target.files[0]
    const fileContent = await readFile(file)
    try {
      const mozbot = JSON.parse(fileContent)
      onNewMozbot({
        ...mozbot,
        events: mozbot.events ?? null,
        icon: mozbot.icon ?? null,
        name: mozbot.name ?? 'My mozbot',
      } as Mozbot)
    } catch (err) {
      console.error(err)
      showToast({
        description: t('templates.importFromFileButon.toastError.description'),
        details: {
          content: JSON.stringify(err, null, 2),
          lang: 'json',
        },
      })
    }
  }

  return (
    <>
      <chakra.input
        type="file"
        id="file-input"
        display="none"
        onChange={handleInputChange}
        accept=".json"
      />
      <Button as="label" htmlFor="file-input" cursor="pointer" {...props}>
        {props.children}
      </Button>
    </>
  )
}

const readFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => {
      fr.result && resolve(fr.result.toString())
    }
    fr.onerror = reject
    fr.readAsText(file)
  })
}
