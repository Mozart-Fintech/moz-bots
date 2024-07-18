import { CodeEditor } from '@/components/inputs/CodeEditor'

export const InstallReactPackageSnippet = () => {
  return (
    <CodeEditor
      value={`npm install @mozbot.io/js @mozbot.io/react`}
      isReadOnly
      lang="shell"
    />
  )
}
