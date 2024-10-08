import { PaymentInputBlock } from '@mozbot.io/schemas'
import { StripePaymentForm } from './StripePaymentForm'
import { PaymentProvider } from '@mozbot.io/schemas/features/blocks/inputs/payment/constants'

type Props = {
  onSuccess: () => void
  options: PaymentInputBlock['options']
}

export const PaymentForm = ({ onSuccess, options }: Props): JSX.Element => {
  switch (options?.provider) {
    case undefined:
    case PaymentProvider.STRIPE:
      return <StripePaymentForm onSuccess={onSuccess} options={options} />
  }
}
