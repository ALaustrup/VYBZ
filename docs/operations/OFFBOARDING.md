# Offboarding

> Revoke access when a human, agent credential, or vendor integration leaves the trust set.

## Checklist

1. **GitHub** — remove from `ALaustrup/VYBZ`; revoke PATs / deploy keys.
2. **Vercel** — remove team member; rotate deploy hooks if shared.
3. **Supabase** — remove org members; rotate `service_role` / access tokens if exposed.
4. **Stripe** — revoke restricted keys; review webhook endpoints and Connect access.
5. **Resend / LiveKit / fal / Groq / Cloudflare / OVH** — remove users; rotate API keys.
6. **Cursor / MCP / Zapier** — disconnect OAuth and delete stored secrets.
7. **Feature flags** — disable experimental surfaces tied to that operator.
8. **Export** — if required by policy, export that user’s owned creative data before delete.
9. **Delete** — follow product privacy / account-deletion policy (pointer: `SECURITY.md`
   and future Suite privacy surface); do not silently wipe other users’ content.
10. **Record** — note date, actors, and rotations in private ops log (not public CHANGELOG
    unless user-facing).

Agents never retain production secrets in docs or commits.
See [`INCIDENT_RESPONSE.md`](./INCIDENT_RESPONSE.md), [`SECURITY.md`](../../SECURITY.md).
