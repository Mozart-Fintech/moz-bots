import { CodeEditor } from '@/components/inputs/CodeEditor'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import parserBabel from 'prettier/parser-babel'
import prettier from 'prettier/standalone'
import { parseReactBotProps } from '../../snippetParsers'

type ReactStandardSnippetProps = { widthLabel?: string; heightLabel: string }

export const ReactStandardSnippet = ({
  widthLabel,
  heightLabel,
}: ReactStandardSnippetProps) => {
  const { mozbot } = useMozbot()
  const snippet = prettier.format(
    `import { Standard } from "@mozbot.io/react";

      const App = () => {
        return <Standard ${parseReactBotProps({
          mozbot: mozbot?.publicId ?? '',
        })} style={{width: "${widthLabel}", height: "${heightLabel}"}} />
      }`,
    {
      parser: 'babel',
      plugins: [parserBabel],
    }
  )
  return <CodeEditor value={snippet} lang="javascript" isReadOnly />
}
