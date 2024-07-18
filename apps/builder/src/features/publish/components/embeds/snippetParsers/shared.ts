import { BotProps } from '@mozbot.io/nextjs'
import parserBabel from 'prettier/parser-babel'
import prettier from 'prettier/standalone'
import { isDefined } from '@mozbot.io/lib'
import { Mozbot } from '@mozbot.io/schemas'
import { isCloudProdInstance } from '@/helpers/isCloudProdInstance'
import packageJson from '../../../../../../../../packages/embeds/js/package.json'
import { env } from '@mozbot.io/env'

export const parseStringParam = (
  fieldName: string,
  fieldValue?: string,
  defaultValue?: string
) => {
  if (!fieldValue) return ''
  if (isDefined(defaultValue) && fieldValue === defaultValue) return ''
  return `${fieldName}: "${fieldValue}",`
}

export const parseNumberOrBoolParam = (
  fieldName: string,
  fieldValue?: number | boolean
) => (isDefined(fieldValue) ? `${fieldName}: ${fieldValue},` : ``)

export const parseBotProps = ({ mozbot, apiHost }: BotProps) => {
  const mozbotLine = parseStringParam('mozbot', mozbot as string)
  const apiHostLine = parseStringParam('apiHost', apiHost)
  return `${mozbotLine}${apiHostLine}`
}

export const parseReactStringParam = (fieldName: string, fieldValue?: string) =>
  fieldValue ? `${fieldName}="${fieldValue}"` : ``

export const parseReactNumberOrBoolParam = (
  fieldName: string,
  fieldValue?: number | boolean
) => (isDefined(fieldValue) ? `${fieldName}={${fieldValue}}` : ``)

export const parseReactBotProps = ({ mozbot, apiHost }: BotProps) => {
  const mozbotLine = parseReactStringParam('mozbot', mozbot as string)
  const apiHostLine = parseReactStringParam('apiHost', apiHost)
  return `${mozbotLine} ${apiHostLine}`
}

export const mozbotImportCode = isCloudProdInstance()
  ? `import Mozbot from 'https://cdn.jsdelivr.net/npm/@mozbot.io/js@0.3/dist/web.js'`
  : `import Mozbot from 'https://cdn.jsdelivr.net/npm/@mozbot.io/js@${packageJson.version}/dist/web.js'`

export const parseInlineScript = (script: string) =>
  prettier.format(
    `const mozbotInitScript = document.createElement("script");
  mozbotInitScript.type = "module";
  mozbotInitScript.innerHTML = \`${script}\`;
  document.body.append(mozbotInitScript);`,
    { parser: 'babel', plugins: [parserBabel] }
  )

export const parseApiHost = (
  customDomain: Mozbot['customDomain'] | undefined
) => {
  if (customDomain) return new URL(`https://${customDomain}`).origin
  return env.NEXT_PUBLIC_VIEWER_URL.at(1) ?? env.NEXT_PUBLIC_VIEWER_URL[0]
}

export const parseApiHostValue = (
  customDomain: Mozbot['customDomain'] | undefined
) => {
  if (isCloudProdInstance()) return
  return parseApiHost(customDomain)
}
