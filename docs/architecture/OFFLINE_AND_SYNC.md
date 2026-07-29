# Offline drafts and synchronization

> Realistic offline strategy — not full offline collaboration. Authority: Master Blueprint §14.

## First practical target

- Cached project summaries and Findings
- Locally editable metadata drafts
- Pending uploads and mutations
- Last-known job states
- Retry queues
- Connectivity awareness + clear offline / unsynced UI
- User-controlled cancellation

## Mutation queue

See Master Blueprint §14 for `PendingMutation` shape. All mutations require
`idempotencyKey`.

## Sync flow

1. Detect restored connectivity  
2. Refresh / verify session  
3. Revalidate account access  
4. Resume pending uploads  
5. Apply mutations idempotently  
6. Retrieve server versions  
7. Detect conflicts  
8. Auto-merge safe independent fields  
9. Present genuine same-field conflicts  
10. Refresh caches  
11. Record outcomes  

## Conflict classes

Independent fields · same-field edits · deleted projects · removed collaborator
access · replaced files · expired sessions · entitlement changes · account
suspension/deletion.

## Non-goals (until later)

Conflict-free real-time co-editing while offline; Android heavy background sync
beyond platform limits.
