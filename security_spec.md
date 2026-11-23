# Security Specification — Global Leaderboards (Firestore)

## 1. Data Invariants

1. **Identity Ownership**: A user may only create, update, or delete `/users/{userId}` and `/leaderboards/{levelKey}/entries/{userId}` where `userId == request.auth.uid` and `incoming().userId == request.auth.uid`.
2. **Verified Accounts Only on Write**: Every write requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Zero PII Exposure**: Leaderboard entries never store `email`, `phone`, or `address`. Only a sanitized public handle (`playerName`, 2–28 characters matching `^[a-zA-Z0-9 _\-.!]+$`) is stored. `/users/{userId}` is strictly owner-only `get` (no `list`).
4. **Master Gate & Atomicity**: Every score entry under `/leaderboards/{levelKey}/entries/{userId}` requires the parent `/leaderboards/{levelKey}` document to exist atomically (`existsAfter` on `create`, `exists` on `update`), and `levelKey` must strictly match `^level_([1-9]|[1-9][0-9]|100)$` with `levelKey == 'level_' + string(incoming().levelId)`.
5. **Monotonic Best Time**: Updating a score entry's `bestTimeMs` must only improve or match the existing best time (`incoming().bestTimeMs <= existing().bestTimeMs`), and `bestTimeMs` must be bounded (`500 <= bestTimeMs <= 36000000`).
6. **Immutable Identity & Creation Fields**: `userId`, `levelId`, and `createdAt` can never be mutated after creation.
7. **Server Timestamps Only**: `createdAt == request.time` on create; `updatedAt == request.time` on both create and update.
8. **Bounded & Validated Queries**: `allow list` on `/leaderboards/{levelKey}/entries` explicitly checks `existing().bestTimeMs >= 500` and `request.query.limit <= 50` with zero `get()`/`exists()` lookups inside `list`.

---

## 2. The "Dirty Dozen" Attack Payloads (Must All Return `PERMISSION_DENIED`)

1. **Unauthenticated Score Injection**: Unauthenticated client attempts `setDoc` on `/leaderboards/level_100/entries/attacker`.
2. **Unverified Email Write**: Authenticated user with `email_verified: false` attempts to create a score entry.
3. **Identity Spoofing**: User `uid_A` attempts to write `/leaderboards/level_99/entries/uid_B` or sets `userId: "uid_B"` inside `/leaderboards/level_99/entries/uid_A`.
4. **Shadow Field / Ghost Property Injection**: User `uid_A` writes a valid entry plus `"isAdmin": true` or `"verified": true`.
5. **Invalid Document ID Poisoning**: User attempts to write `/leaderboards/level_999/entries/uid_A` or a 200-char junk `levelKey`.
6. **Level Key Mismatch**: User writes `levelId: 1` inside `/leaderboards/level_100/entries/uid_A` to spoof a Level 100 clear using a Level 1 time.
7. **Impossible / Negative Time Poisoning**: User submits `bestTimeMs: 1` (below 500ms floor) or `bestTimeMs: -50` or string `"1000"`.
8. **Orphaned Entry (Atomicity Bypass)**: User creates `/leaderboards/level_50/entries/uid_A` without the parent `/leaderboards/level_50` document existing or being created in the same batch.
9. **Client Timestamp Forgery**: User submits a fabricated past timestamp `createdAt` or `updatedAt` instead of `serverTimestamp()`.
10. **Immutable Field Tampering**: On update, user attempts to change `createdAt`, `userId`, or `levelId`.
11. **Oversized Handle / PII Format Injection**: User sets `playerName` to a 200-char string or an email address (`victim@example.com` fails `^[a-zA-Z0-9 _\-.!]+$`).
12. **PII / Profile Cross-User Snooping & Unbounded List Scraping**: User `uid_A` attempts `get` on `/users/uid_B`, `list` on `/users`, or `list` on `/leaderboards/level_100/entries` without `limit <= 50`.
