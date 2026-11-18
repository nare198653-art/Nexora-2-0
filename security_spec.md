# Nexora Security Specification (Auth-Free Workspace Integrity)

## 1. Data Invariants

1. **Workspace Scoping & Path Integrity**:
   - Every document under `/users/{userId}/...` must enforce `isValidId(userId)` (`^[a-zA-Z0-9_\-]+$`, max 128 bytes).
   - `userId` stored inside any workspace document must equal `{userId}` on creation and remain immutable on update.
2. **PII Split-Collection Isolation**:
   - Email addresses (`email`) and private behavioral memory (`memory`, `momentumRescue`, `journeyEngine`) live exclusively in `/users/{userId}` (`allow list: if false;`).
   - Shared discovery/leaderboards read strictly from `/public_profiles/{userId}`, which rejects any PII fields (`email`, `phone`, `address`) via strict `keys().hasOnly(...)`.
3. **Ghost Mode Ephemeral Guarantee**:
   - Ghost mode never writes tasks, messages, profiles, or sessions to Firestore or Storage.
4. **Master Gate Relational Integrity**:
   - `/users/{userId}/conversations/{convId}/messages/{msgId}` verifies parent conversation existence and workspace consistency (`exists(...)` and `get(...).data.userId == userId`).
   - `/posts/{postId}/comments/{commentId}` and `/posts/{postId}/likes/{likeUserId}` verify parent `/posts/{postId}` exists.
5. **Atomicity Guarantee (`likesCount` & `PostLike`)**:
   - Creating or deleting `/posts/{postId}/likes/{likeUserId}` requires `isValidPostLike(incoming(), postId, likeUserId)` and verifies via `getAfter()` that parent `/posts/{postId}` updates `likes` atomically by +/- 1 in the same write batch/transaction.
6. **Terminal State Locking (`focusSessions`)**:
   - Once a `FocusSession` document reaches `status == 'completed'`, `status`, `xpAwarded`, `durationSeconds`, `elapsedSeconds`, `startedAt`, and `userId` cannot be modified again (only post-completion `reflection` notes and `updatedAt` may be recorded).
7. **Temporal Integrity & Bounded Arrays/Strings**:
   - Every create operation enforces `createdAt == request.time && updatedAt == request.time`, and every update enforces `incoming().createdAt == existing().createdAt && incoming().updatedAt == request.time`.
   - Every string field enforces strict `.size()` bounds; every array enforces `.size() <= MAX` and first-element type verification.
8. **Secure Query Enforcement (Zero Blanket Reads)**:
   - Every `allow list` validates `resource.data` (e.g., `existing().userId == userId`, `existing().visibility in ['public', 'private', 'circles']`, `existing().isPublic == true`) with zero `get()`/`exists()` inside `allow list`.

---

## 2. Adversarial Payloads (Must All Yield `PERMISSION_DENIED`)

1. **P1 — Unmatched Root Document Access**: Any access outside explicit collections is rejected by global `match /{document=**} { allow read, write: if false; }`.
2. **P2 — User List Enumeration**: `list /users` is explicitly rejected via `allow list: if false;`.
3. **P3 — Workspace ID Spoofing in Subcollection**: Creating `/users/ws_1/tasks/t1` with mismatched `userId: 'ws_2'` is blocked by `data.userId == userId`.
4. **P4 — Immutable Timestamp / Owner Mutability**: Updating `createdAt` or `userId` on `/users/ws_1` or any subcollection is blocked by `incoming().userId == existing().userId` and `incoming().createdAt == existing().createdAt`.
5. **P5 — Shadow Field Injection on Public Profile**: Writing `{ ..., email: 'leak@evil.com', isAdmin: true }` to `/public_profiles/ws_1` is rejected via strict `keys().hasOnly(...)`.
6. **P6 — Path Variable ID Poisoning**: Creating `/users/ws_1/tasks/bad$id..with!chars_and_over_128_len` is blocked via `isValidId`.
7. **P7 — Terminal Focus Session Tampering**: Mutating `xpAwarded` or resetting `status: 'active'` on a `focusSessions` doc whose existing `status == 'completed'` is blocked.
8. **P8 — Non-Atomic Post Like Creation**: Creating `/posts/p1/likes/ws_1` without incrementing `posts/p1.likes` in the same batch is blocked by `getAfter(...)` check.
9. **P9 — Orphaned Comment Create**: Creating `/posts/nonexistent_post/comments/c1` is blocked by parent post `exists(...)` gate.
10. **P10 — Client Timestamp Forgery**: Creating `/users/ws_1/tasks/t1` with client timestamp `createdAt: 123456` instead of `request.time` is rejected.
11. **P11 — Unbounded Array / 1MB Resource Poisoning**: Writing a 50,000-char `title` or 50 `tags` to `/posts/p1` is blocked by `.size()` bounds.
12. **P12 — Message Mutation After Creation**: Updating `/users/ws_1/conversations/c1/messages/m1` or `/saved_brain_messages/msg1` is rejected via `allow update: if false;`.
