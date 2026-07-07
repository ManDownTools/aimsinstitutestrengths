// Fires a brand toast. Toaster component in the root layout listens for these.
export function showToast(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("aims-toast", { detail: { message } }),
  );
}
