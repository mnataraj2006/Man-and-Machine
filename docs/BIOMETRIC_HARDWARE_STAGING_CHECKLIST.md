# Man & Machine — eSSL X2008 Hardware Staging & Deployment Checklist

**CRITICAL:** Do NOT execute any live hardware changes or bulk migrations without following this checklist in order. Preserve all existing X2008 records (~263 users, ~248 face templates, ~15 fingerprint templates).

---

## 1. Pre-Staging Rollback & Safety Baseline
1. Record the current X2008 ADMS server IP/port (`Comm → ADMS / Cloud Server Setting`) and current attendance software connection details before changing anything.
2. Confirm a MongoDB Atlas snapshot/backup exists before running any migration preview or bulk mapping.
3. Reserve a dedicated unused test PIN (e.g., `9999`) **only after verifying both**:
   - In the physical X2008 `User Mgt` menu that PIN `9999` does not exist.
   - In MongoDB / Admin Portal (`Biometric Devices → User Mappings` and `Enrollment Requests`) that PIN `9999` is not mapped or reserved in `BiometricUserMapping` or `BiometricEnrollment`.
   **Never use an existing member's PIN for testing.**
4. **Rollback Step:** If anything behaves unexpectedly during staging, revert the X2008 `Comm → ADMS` server address/port back to the recorded baseline value and stop the local `ManAndMachine-ADMS-Bridge` service.

---

## 1B. Staging Deployment & Pre-Flight Checklist
1. **Separate Staging Database & Credentials:** Point staging `MONGODB_URI` to a dedicated staging database/cluster (never production `man_and_machine` data) with normal TLS certificate validation (`tlsAllowInvalidCertificates` disabled).
2. **ADMS Secret Configuration:** Set `ADMS_SHARED_SECRET` on staging backend to match `BRIDGE_SHARED_SECRET` in staging `ManAndMachine-ADMS-Bridge/.env` (never print or commit secret values).
3. **Command Dispatch Safety:** Confirm `ADMS_COMMAND_DISPATCH_ENABLED` is **unset or `false`**.
4. **Branch Authorization Tests:** Verify branch-scoped admin gets `403` on cross-branch device/client/enrollment/mapping/command endpoints and `createClient`, while super-admin (`branchId: null`) retains global access.
5. **Consent & Enrollment State Tests:** Verify `REVOKED` cannot be approved or physically enrolled (`409`), and renewed consent transitions `REVOKED` → `CAPTURE_IN_PROGRESS` without reactivating old `INACTIVE` mappings.
6. **Mapping, Unmapping & Attendance Tests:** Verify `ATTLOG` writes `source: 'BIOMETRIC_ADMS'`, `getClientBiometricSummary` / `getClientBiometricLogs` display `lastPunchAt`, `lastPunchResult`, and `biometricAttendances`, and IST date filtering works across `00:00 IST` and `05:30 IST`.
7. **Migration Preview & Dry-Run Tests:** Run `GET /api/biometric/migration/preview` and `POST /api/biometric/migration/bulk-map` with `dryRun: true` on staging; verify zero writes and accurate conflict reporting.
8. **Rollback Procedure:** If staging verification fails, revert the Render/Vercel deployment to the previous release, keep `ADMS_COMMAND_DISPATCH_ENABLED=false`, and do not switch the physical X2008.

---

## 2. 13-Step Manual Hardware Staging Checklist
1. **LAN Connectivity:** From the Windows bridge host, ping the eSSL X2008 LAN IP and confirm reachability.
2. **Bridge Reachability:** Verify `ManAndMachine-ADMS-Bridge` is running on port `8081` and `http://127.0.0.1:8081/health` reports `cloud.reachable: true`.
3. **Attendance Platform Handover:** Confirm with gym operations whether the legacy attendance software is paused or if a staging window is active.
4. **Controlled Heartbeat:** Point the X2008 ADMS setting to the local bridge (`<Bridge-LAN-IP>:8081`) and verify `GET /iclock/cdata?SN=TDDB250600919` returns `200 OK` and Admin Dashboard shows **ONLINE (Healthy)**.
5. **Single Test-User Physical Enrollment:** On the X2008 (`Menu → User Mgt → New User`), enroll a test user under the unused test PIN (`9999`) with face capture.
6. **Verify OPERLOG User Discovery:** Confirm `POST /iclock/cdata?table=OPERLOG` populates `discoveredUsers` with PIN `9999` without modifying any existing users.
7. **Verify Manual Client Mapping:** In Admin → Biometric Devices → Existing Users Migration (or Member Enrollment), map PIN `9999` to a dedicated test client profile and verify `BiometricEnrollment` becomes `ENROLLED`.
8. **Single Test Punch:** Perform one face check-in as PIN `9999` on the X2008.
9. **Verify Render Ingestion:** Confirm `ManAndMachine-ADMS-Bridge` flushes `ATTLOG` to Render `POST /iclock/cdata?table=ATTLOG` with `200 OK`.
10. **Verify MongoDB Attendance Record:** Confirm a single `Attendance` document is created with `source: 'BIOMETRIC_ADMS'`, correct `branchId`, `clientProfileId`, `date` (IST), and `attendanceStatus`.
11. **Verify Admin Dashboard:** Confirm the punch appears in Biometric Devices → Biometric Attendance and Admin → Clients → Client Details (`lastPunchAt`, `lastPunchResult`, `Biometric Logs`).
12. **Verify Client Attendance History:** Log in as the test client and confirm the biometric check-in appears in Client → Attendance and Client → Biometric Access.
13. **Verify Existing Device Inventory Intact:** On the X2008 (`System Info / User Mgt`), confirm all original ~263 users, ~248 faces, and ~15 fingerprints are still intact.

---

## 3. Render & Vercel Deployment Instructions
* **Render (Backend):**
  1. Ensure environment variables are set: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `ADMS_SHARED_SECRET` (matching `BRIDGE_SHARED_SECRET` in `ManAndMachine-ADMS-Bridge/.env`), `CLIENT_URL`, `FRONTEND_URL`.
  2. Deploy the `backend/` service from the verified branch.
  3. Verify `GET /api/health` returns `200 OK`.
* **Vercel (Frontend):**
  1. Ensure `VITE_API_URL` points to the Render `/api` URL.
  2. Deploy `frontend/` from the verified branch.
* **Database Migration:**
  1. No destructive schema migrations or collection drops are required.
  2. Use **Admin → Biometric Devices → Existing Users Migration** to run **Dry Run Validation** first, review conflicts, and confirm mappings in batches.
