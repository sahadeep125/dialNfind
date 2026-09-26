/**
 * Razorpay Checkout, loaded only on pages that take payments: subscriptions for plans
 * (https://razorpay.com/docs/payments/subscriptions/integration-guide/) and one-off orders for promotions.
 */

interface CheckoutSuccess {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

interface OrderSuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface CheckoutOptions {
  key: string;
  subscription_id?: string;
  order_id?: string;
  /** Paise; required with order_id. */
  amount?: number;
  currency?: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color: string };
  handler: (res: CheckoutSuccess & OrderSuccess) => void;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: CheckoutOptions) => { open: () => void; on: (event: "payment.failed", cb: (res: { error: { description: string } }) => void) => void };
  }
}

let loading: Promise<void> | null = null;

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error("Could not load the payment window. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });
  return loading;
}

/**
 * Opens Razorpay Checkout for a subscription. Resolves with the signed result on success, null if
 * the provider closes the window, and rejects when the payment fails.
 */
export function openCheckout(options: Omit<CheckoutOptions, "handler" | "modal" | "order_id"> & { subscription_id: string }): Promise<CheckoutSuccess | null> {
  return open(options);
}

/** Opens Razorpay Checkout for a one-off order (a promotion). Same results as openCheckout. */
export function openOrderCheckout(options: Omit<CheckoutOptions, "handler" | "modal" | "subscription_id"> & { order_id: string; amount: number }): Promise<OrderSuccess | null> {
  return open(options);
}

async function open(options: Omit<CheckoutOptions, "handler" | "modal">): Promise<(CheckoutSuccess & OrderSuccess) | null> {
  await loadCheckout();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      ...options,
      handler: (res) => resolve(res),
      modal: { ondismiss: () => resolve(null) },
    });
    rzp.on("payment.failed", (res) => reject(new Error(res.error.description || "The payment did not go through")));
    rzp.open();
  });
}
