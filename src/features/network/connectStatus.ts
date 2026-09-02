/** Connect is spent when a pending or accepted row already exists. Declined can request again. */
export function connectButtonIsSpent(status: string | null | undefined): boolean {
  return status === "pending" || status === "accepted";
}
