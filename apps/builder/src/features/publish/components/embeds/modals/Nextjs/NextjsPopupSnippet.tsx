import { CodeEditor } from '@/components/inputs/CodeEditor'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { PopupProps } from '@mozbot.io/nextjs'
import parserBabel from 'prettier/parser-babel'
import prettier from 'prettier/standalone'
import { parseReactPopupProps } from '../../snippetParsers'

export const NextjsPopupSnippet = ({
  autoShowDelay,
}: Pick<PopupProps, 'autoShowDelay'>) => {
  const { mozbot } = useMozbot()

  const snippet = prettier.format(
    `import { Popup } from "@mozbot.io/nextjs";

      const App = () => {
        return <Popup ${parseReactPopupProps({
          mozbot: mozbot?.publicId ?? '',
          autoShowDelay,
        })}/>;
      }`,
    {
      parser: 'babel',
      plugins: [parserBabel],
    }
  )

  return <CodeEditor value={snippet} lang="javascript" isReadOnly />
}
