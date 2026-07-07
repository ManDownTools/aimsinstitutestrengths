"use client";

import { useState } from "react";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  helpText?: string;
  disabled?: boolean;
  variant?: "compact" | "lg";
};

export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete = "current-password",
  required = true,
  minLength,
  helpText,
  disabled = false,
  variant = "compact",
}: Props) {
  const [visible, setVisible] = useState(false);
  const lg = variant === "lg";
  return (
    <div className={lg ? "field-modern" : "field"}>
      <label htmlFor={id}>{label}</label>
      <div className={lg ? "password-wrap-lg" : "password-wrap"}>
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={lg ? "input-lg" : "input password-input"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          disabled={disabled}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeOff /> : <Eye />}
        </button>
      </div>
      {helpText && <div className="field-help">{helpText}</div>}
    </div>
  );
}

function Eye() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1.5 12s3.75-7.5 10.5-7.5S22.5 12 22.5 12 18.75 19.5 12 19.5 1.5 12 1.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19.5c-6.75 0-10.5-7.5-10.5-7.5a19.6 19.6 0 0 1 4.22-5.19M9.9 4.72A10.94 10.94 0 0 1 12 4.5c6.75 0 10.5 7.5 10.5 7.5a19.6 19.6 0 0 1-2.4 3.42M9.88 9.88a3 3 0 0 0 4.24 4.24" />
      <line x1="1.5" y1="1.5" x2="22.5" y2="22.5" />
    </svg>
  );
}
