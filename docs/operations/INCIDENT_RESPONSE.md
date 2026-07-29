# Incident Response

## Severity

| Level | Meaning | Example | Response |
|-------|---------|---------|----------|
| **SEV1** | Money, auth, or data breach | Stripe webhook forge, leaked `service_role` | Page owner; rotate now; freeze spend |
| **SEV2** | Core product down | Auth outage, Storage CDN fail | Mitigate; status note; hotfix |
| **SEV3** | Degraded feature | LiveKit cap hit, Resend throttle | Degrade UX; Cap Sentinel |
| **SEV4** | Cosmetic / low | Single flag mis-set | Track; next deploy |

## Immediate actions (SEV1–2)

1. Preserve evidence (logs, deploy ID, request IDs) — do not wipe.
2. **Rotate secrets**: Supabase service_role / JWT, Stripe webhook secret, Resend, LiveKit,
   fal, Groq, TURN, any pasted credentials.
3. Revoke compromised sessions / API keys; disable risky feature flags.
4. Redeploy Edge functions if secret material was embedded in old deploys (usually secrets
   are env — still rotate + verify).
5. Status: owner posts brief truth to stakeholders; no speculative blame.

## After action

- Root cause in CHANGELOG or private ops note.
- Update gates / Cost Sentinel caps if spend-related.
- Offboard any third party who no longer needs access ([`OFFBOARDING.md`](./OFFBOARDING.md)).

Observability: [`OBSERVABILITY.md`](./OBSERVABILITY.md).
