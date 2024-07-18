import prettier from 'prettier/standalone'
import parserHtml from 'prettier/parser-html'
import {
  parseApiHostValue,
  parseInitBubbleCode,
  mozbotImportCode,
} from '../../snippetParsers'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { CodeEditor } from '@/components/inputs/CodeEditor'
import { BubbleProps } from '@mozbot.io/nextjs'

type Props = Pick<BubbleProps, 'theme' | 'previewMessage'>

export const JavascriptBubbleSnippet = ({ theme, previewMessage }: Props) => {
  const { mozbot } = useMozbot()

  const snippet = prettier.format(
    `<script type="module">${mozbotImportCode}
    
${parseInitBubbleCode({
  mozbot: mozbot?.publicId ?? '',
  apiHost: parseApiHostValue(mozbot?.customDomain),
  theme: {
    ...theme,
    chatWindow: {
      backgroundColor: mozbot?.theme.general?.background?.content ?? '#fff',
    },
  },
  previewMessage,
})}</script>`,
    {
      parser: 'html',
      plugins: [parserHtml],
    }
  )

  return <CodeEditor value={snippet} lang="html" isReadOnly />
}
