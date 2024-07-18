import { CodeEditor } from '@/components/inputs/CodeEditor'

export const InstallNextjsPackageSnippet = () => {
  return (
    <CodeEditor
      value={`npm install @mozbot.io/js @mozbot.io/nextjs`}
      isReadOnly
      lang="shell"
    />
  )
}
