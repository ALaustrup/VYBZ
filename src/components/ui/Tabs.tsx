import {
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cx } from "@/lib/utils";

export type TabItem = {
  id: string;
  label: ReactNode;
  disabled?: boolean;
};

export type TabsProps = {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  className?: string;
  children?: ReactNode;
};

export function Tabs({
  items,
  value,
  defaultValue,
  onChange,
  className,
  children,
}: TabsProps) {
  const autoId = useId();
  const first = items.find((t) => !t.disabled)?.id ?? items[0]?.id ?? "";
  const [internal, setInternal] = useState(defaultValue ?? first);
  const active = value ?? internal;

  const select = (id: string) => {
    if (value === undefined) setInternal(id);
    onChange?.(id);
  };

  const enabled = items.filter((t) => !t.disabled);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = enabled.findIndex((t) => t.id === active);
    if (idx < 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      select(enabled[(idx + 1) % enabled.length].id);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      select(enabled[(idx - 1 + enabled.length) % enabled.length].id);
    } else if (e.key === "Home") {
      e.preventDefault();
      select(enabled[0].id);
    } else if (e.key === "End") {
      e.preventDefault();
      select(enabled[enabled.length - 1].id);
    }
  };

  return (
    <div className={cx("flex flex-col gap-3", className)}>
      <div
        role="tablist"
        className="flex gap-1 border-b border-[var(--hairline)]"
        onKeyDown={onKeyDown}
      >
        {items.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${autoId}-${tab.id}`}
              aria-selected={selected}
              disabled={tab.disabled}
              tabIndex={selected ? 0 : -1}
              onClick={() => !tab.disabled && select(tab.id)}
              className={cx(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition duration-suite-base",
                "focus-visible:outline-none focus-visible:shadow-suite-focus rounded-t-suite-sm",
                "disabled:opacity-40 disabled:pointer-events-none motion-reduce:transition-none",
                selected
                  ? "border-suite-cyan text-snow"
                  : "border-transparent text-fog hover:text-snow"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
