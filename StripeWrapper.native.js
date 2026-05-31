 import { StripeProvider } from '@stripe/stripe-react-native';

const STRIPE_KEY = 'pk_test_51Td06aGitBo7CbKlqP8kd6E6rvRWChHZTGKbHwbYLOBTOrdti2K7nQqVPkHJySzVo5i27ZpI1uIFtXO0KoPTypoZ00NiMUzhWc';

export default function StripeWrapper({ children }) {
  return (
    <StripeProvider publishableKey={STRIPE_KEY}>
      {children}
    </StripeProvider>
  );
}
