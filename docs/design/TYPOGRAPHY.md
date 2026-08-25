# Typography

> Type system. Suite Genesis is a historical era name, not the product. Avoid default Inter / Roboto / Arial stacks.

## Families (shipped)

| Role | Family | Why |
|------|--------|-----|
| UI / body | **Lexend** | High x-height; reading-proficiency research; full weights |
| Display / chrome | **Atkinson Hyperlegible** | Braille Institute; I/l/1 and 0/O disambiguation |

Fallback: `ui-sans-serif, system-ui, sans-serif` only after Lexend/Atkinson.

## Hierarchy

| Level | Use |
|-------|-----|
| Display | Marketing hero, splash “Find Yours.” |
| Title | Product page H1, Suite section heads |
| Body | Forms, findings, settings |
| Caption | Meta, timestamps, severity notes |
| Micro | Rail labels, dock chrome |

## Rules

- One strong display moment per first viewport; body stays Lexend.
- Professional tools: tighter leading, less display flair.
- Audience / Artist: Atkinson display allowed; never sacrifice contrast.
- Do not introduce a third brand sans without Owner approval.
- Numeric tables (credits, loudness): prefer tabular figures when available.

## Code touchpoints

Existing: `src/index.css`, `src/main.tsx` font loading. Phase 1 tokens should
alias `--font-sans` / `--font-display` to these families — not replace them.
