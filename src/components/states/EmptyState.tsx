import type { ReactNode } from "react";
import { StateView, type StateViewProps } from "./StateView";

export type EmptyStateProps = Omit<StateViewProps, "variant"> & {
  children?: ReactNode;
};

/** Thin wrapper around StateView empty. Does not replace `@/components/EmptyState`. */
export function EmptyState({ children, body, ...rest }: EmptyStateProps) {
  return <StateView variant="empty" body={body ?? children} {...rest} />;
}
