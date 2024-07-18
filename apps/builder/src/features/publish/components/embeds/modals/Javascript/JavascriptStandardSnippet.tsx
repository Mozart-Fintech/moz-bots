import parserHtml from 'prettier/parser-html'
import prettier from 'prettier/standalone'
import {
  parseApiHostValue,
  parseInitStandardCode,
  mozbotImportCode,
} from '../../snippetParsers'
import { useMozbot } from '@/features/editor/providers/MozbotProvider'
import { CodeEditor } from '@/components/inputs/CodeEditor'

type Props = {
  widthLabel?: string
  heightLabel?: string
}

export const JavascriptStandardSnippet = ({
  widthLabel,
  heightLabel,
}: Props) => {
  const { mozbot } = useMozbot()

  const snippet = prettier.format(
    `${parseStandardHeadCode(mozbot?.publicId, mozbot?.customDomain)}
      ${parseStandardElementCode(widthLabel, heightLabel)}`,
    {
      parser: 'html',
      plugins: [parserHtml],
    }
  )

  return <CodeEditor value={snippet} lang="html" isReadOnly />
}

export const parseStandardHeadCode = (
  publicId?: string | null,
  customDomain?: string | null
) =>
  prettier.format(
    `<script type="module">${mozbotImportCode};

${parseInitStandardCode({
  mozbot: publicId ?? '',
  apiHost: parseApiHostValue(customDomain),
})}</script>`,
    { parser: 'html', plugins: [parserHtml] }
  )

export const parseStandardElementCode = (width?: string, height?: string) => {
  if (!width && !height) return '<mozbot-standard></mozbot-standard>'
  return prettier.format(
    `<mozbot-standard style="${width ? `width: ${width}; ` : ''}${
      height ? `height: ${height}; ` : ''
    }"></mozbot-standard>`,
    { parser: 'html', plugins: [parserHtml] }
  )
}
