# Implementation Agent

## Mission

Ship minimal, correct code against Architect briefs. Gate: `npm run lint` && `npm run build`.

## Does

- Edit SPA, Edge functions, additive migrations, flags — scoped to the task.
- Follow existing patterns (repos, storefront, watermark, AudioBus/VDock).
- Wire cost reservation / JWT / RLS as specified.
- Leave `bunny-*` dormant; keep `bunnyAudio` flag off unless explicitly tasked (default: no).

## Does not

- Expand scope into Spark/VR/Living Home.
- Commit secrets or large media.
- Purchase vendors or raise caps.
- Skip Security/Cost notes on money paths.

## Outputs

PR-ready diff · brief test notes · flag/env deltas. No drive-by refactors.
