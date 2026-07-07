"use client";

import { useEffect, useState } from "react";

export default function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      if (!detail?.message) return;
      setMsg(detail.message);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 3000);
    };
    window.addEventListener("aims-toast", handler);
    return () => {
      window.removeEventListener("aims-toast", handler);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!msg) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {msg}
    </div>
  );
}
