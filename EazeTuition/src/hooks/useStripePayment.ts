import { useStripe } from "@stripe/stripe-react-native";

export function useStripePayment() {
  const stripe = useStripe();

  const payWithStripe = async (sheetData: any) => {
    const init = await stripe.initPaymentSheet({
      merchantDisplayName: "EazeTuition",
      customerId: sheetData.customer,
      customerEphemeralKeySecret: sheetData.ephemeralKey,
      paymentIntentClientSecret: sheetData.paymentIntent,
    });

    if (init.error) return { error: init.error.message };

    const result = await stripe.presentPaymentSheet();

    if (result.error) {
      if (result.error.code === "Canceled") return { cancelled: true };
      return { error: result.error.message };
    }

    return { success: true };
  };

  return { payWithStripe };
}
