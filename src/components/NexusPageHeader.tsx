import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type NexusPageHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  backTo?: { href: string; label: string };
  children?: ReactNode;
};

/** Consistent Nexus typography block for authenticated product pages. */
export function NexusPageHeader({ eyebrow, title, subtitle, backTo, children }: NexusPageHeaderProps) {
  return (
    <header>
      {backTo ? (
        <Link to={backTo.href} className="text-xs text-fog hover:text-snow">
          {backTo.label}
        </Link>
      ) : null}
      <p className={`nexus-eyebrow ${backTo ? "mt-3" : ""}`}>{eyebrow}</p>
      <h1 className="nexus-headline mt-2 text-2xl md:text-3xl">{title}</h1>
      {subtitle ? <p className="nexus-subline mt-2 text-sm">{subtitle}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}
