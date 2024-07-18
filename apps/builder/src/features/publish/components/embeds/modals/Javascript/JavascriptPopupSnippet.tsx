import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import parserHtml from 'prettier/parser-html'
import prettier from 'prettier/standalone'
import {
  parseApiHostValue,
  parseInitPopupCode,
  mozbotImportCode,
} from '../../snippetParsers'
import { CodeEditor } from '@/components/inputs/CodeEditor'
import { PopupProps } from '@mozbot.io/nextjs'

type Props = Pick<PopupProps, 'autoShowDelay'>

export const JavascriptPopupSnippet = ({ autoShowDelay }: Props) => {
  const { mozbot } = useMozbot()
  const snippet = prettier.format(
    createSnippet({
      mozbot: mozbot?.publicId ?? '',
      apiHost: parseApiHostValue(mozbot?.customDomain),
      autoShowDelay,
    }),
    {
      parser: 'html',
      plugins: [parserHtml],
    }
  )
  return <CodeEditor value={snippet} lang="html" isReadOnly />
}

const createSnippet = (params: PopupProps): string => {
  const jsCode = parseInitPopupCode(params)
  return `<script type="module">${mozbotImportCode}

${jsCode}</script>`
}
