import { BotProps } from '@mozbot.io/nextjs'
import parserBabel from 'prettier/parser-babel'
import prettier from 'prettier/standalone'
import { parseBotProps } from './shared'

export const parseInitStandardCode = ({
  mozbot,
  apiHost,
}: Pick<BotProps, 'mozbot' | 'apiHost'>) => {
  const botProps = parseBotProps({ mozbot, apiHost })

  return prettier.format(`Mozbot.initStandard({${botProps}});`, {
    parser: 'babel',
    plugins: [parserBabel],
  })
}
