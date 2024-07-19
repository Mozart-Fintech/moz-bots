import { Seo } from '@/components/Seo'
import { useTranslate } from '@tolgee/react'
import { VStack } from '@chakra-ui/react'
import { IFrameForm } from './IFrameForm'

export const IFramePage = () => {
  const { t } = useTranslate()

  return (
    <VStack spacing={4} h="100vh" justifyContent="center">
      <Seo title={t('auth.signin.heading')} />
      <IFrameForm />
    </VStack>
  )
}
