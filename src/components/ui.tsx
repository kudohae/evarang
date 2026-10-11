import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "quiet";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink/88 disabled:bg-line-strong disabled:text-surface",
  secondary: "border border-line-strong bg-surface text-ink hover:border-ink disabled:text-ink-3 disabled:hover:border-line-strong",
  quiet: "text-ink-2 hover:text-ink hover:bg-wash disabled:text-ink-3 disabled:hover:bg-transparent",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "lg" }) {
  const sizing = size === "lg" ? "h-13 px-7 text-[16px]" : "h-11 px-5 text-[15px]";
  return (
    <button
      {...props}
      className={`inline-flex select-none items-center justify-center gap-2 rounded-ctl font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.985] disabled:cursor-not-allowed disabled:active:scale-100 ${sizing} ${VARIANTS[variant]} ${className}`}
    />
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="text-[17px] font-bold tracking-[-0.02em] text-ink">
      에바랑
    </Link>
  );
}

/** Radio or checkbox row. One visual language for every choice in the test. */
export function ChoiceRow({
  type,
  checked,
  onChange,
  children,
  disabled,
}: {
  type: "radio" | "checkbox";
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={`group flex cursor-pointer items-start gap-3.5 rounded-ctl px-4 py-3.5 transition-colors ${
        checked ? "bg-wash" : "hover:bg-wash/60"
      } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
    >
      <input type={type} checked={checked} onChange={onChange} disabled={disabled} className="peer sr-only" />
      <span
        aria-hidden
        className={`mt-[3px] flex size-[18px] shrink-0 items-center justify-center border-[1.5px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ${
          type === "radio" ? "rounded-full" : "rounded-[5px]"
        } ${checked ? "border-ink bg-ink" : "border-line-strong bg-surface group-hover:border-ink-3"}`}
      >
        {checked &&
          (type === "radio" ? (
            <span className="size-[6px] rounded-full bg-paper" />
          ) : (
            <svg viewBox="0 0 12 12" className="size-[11px] text-paper" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2.5 6.2 5 8.5l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ))}
      </span>
      <span className="text-[15px] leading-[1.55] text-ink">{children}</span>
    </label>
  );
}

const ICONS = {
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  replay: (
    <>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4.5h4.5" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  speaker: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />,
} as const;

export function Icon({ name, className = "size-5" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
