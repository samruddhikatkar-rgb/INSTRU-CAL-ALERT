# Security Specification - VibraSound Inventory Manager

## 1. Data Invariants

- **Authentication**: All read and write operations require authentication.
- **Role-Based Access (RBAC)**:
    - **Admin**: Full read/write access to all collections (`instruments`, `locations`, `users`).
    - **Staff**:
        - `instruments`: Create, Read, Update.
        - `locations`: Read only.
        - `users`: Read only (to identify colleagues).
- **Validation**:
    - `instrument`:
        - `instrument_name`: string (1-100 chars).
        - `manufacturer`: string (1-100 chars).
        - `quantity`: number (>= 0).
        - `location_id`: must exist in `locations`.
        - `status`: enum ["Valid", "Expiring Soon", "Expired"].
    - `location`:
        - `location_name`: string (1-100 chars).
    - `user`:
        - `role`: enum ["Admin", "Staff"].
        - `email`: verified email matching auth.

## 2. The Dirty Dozen Payloads (Targeting Rejection)

1. **Self-Promotion**: Authenticated user (Staff) attempts to update their own `role` to "Admin".
2. **Anonymous Access**: Unauthenticated request attempt to `list` instruments.
3. **Ghost Location**: Creating an instrument with a `location_id` that does not exist.
4. **Denial of Wallet**: Attempting to create an instrument with a 1MB string for `instrument_name`.
5. **Negative Inventory**: Updating an instrument with `quantity: -5`.
6. **Bypassing Validation**: Creating an instrument missing the `manufacturer` field.
7. **Identity Spoofing**: User A attempts to delete User B's record (Staff role).
8. **Malicious Script**: Injecting `<script>alert(1)</script>` into `location_name`.
9. **Role Overstep**: Staff user attempting to delete a location.
10. **State Corruption**: Staff user attempting to update the `email` of another user.
11. **Massive Payload**: Writing 50 fields to an instrument document when only 8 are allowed.
12. **Expired Creation**: Creating an instrument with `status: "Valid"` when `calibration_expiry` is in the past (Logic validation).

## 3. Test Runner Scenarios

All the above scenarios MUST return `PERMISSION_DENIED` in the test runner. 
(Note: Real test file `firestore.rules.test.ts` would be implemented in a dedicated environment, but logic will be enforced in `firestore.rules`).
