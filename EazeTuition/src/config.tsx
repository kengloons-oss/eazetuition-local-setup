// Set EXPO_PUBLIC_API_BASE_URL in the Expo shell before starting Metro.
// Examples: http://10.0.2.2:5000 (Android emulator), or the host LAN IP for a phone.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:5000";


// Stripe publishable keys are public client configuration, but use your own key.
export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
