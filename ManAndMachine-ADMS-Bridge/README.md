# Man & Machine — Windows 11 eSSL ADMS Bridge

Local Windows 11 ADMS bridge that receives attendance and device logs from the **eSSL X2008** (`SN: TDDB250600919`, local IP `192.168.0.203`, port `8081`) over your gym's LAN, persists them safely in a local **SQLite WAL outbox**, and forwards them securely over **HTTPS** to the **Man & Machine Render Backend** using `x-adms-secret`.

```
eSSL X2008 (192.168.0.203)
   │  HTTP ADMS (LAN Port 8081)
   ▼
Windows 11 PC: ManAndMachine-ADMS-Bridge
   ├─► SQLite Outbox (./data/bridge.sqlite) — zero data loss during internet outages
   └─► HTTPS + x-adms-secret ──► Render Backend (/iclock/cdata, /iclock/getrequest, /iclock/devicecmd)
                                      └─► MongoDB Atlas
```

> **Zero external npm dependencies**: Uses Node.js 22+ built-in `node:sqlite`, `node:http`, `node:https`, and `node:test`. No Visual Studio Build Tools or C++ compiler required on Windows 11.

---

## Prerequisites

1. **Windows 11 PC** connected to the same local network (LAN/Wi-Fi) as the eSSL X2008 (`192.168.0.203`).
2. **Node.js 22.5.0 or newer** (LTS recommended). Check with:
   ```powershell
   node -v
   ```
3. **Render Backend** running with `ADMS_SHARED_SECRET` set in Render's Environment Variables.

---

## Step-by-Step Windows 11 Setup Guide

### Step 1 — Set a Static LAN IP on the Windows 11 PC
The eSSL X2008 needs a fixed IP address to send ADMS traffic to.
1. Open **Settings → Network & internet → Ethernet** (or Wi-Fi) → **Edit IP assignment**.
2. Switch from **Automatic (DHCP)** to **Manual** (IPv4).
3. Enter a static IP in the same subnet as `192.168.0.203` (for example, `192.168.0.100`, Subnet mask `255.255.255.0`, Gateway `192.168.0.1`).
4. Note down this Windows 11 PC IP (e.g., `192.168.0.100`).

### Step 2 — Copy the Bridge Folder to the Windows 11 PC
Place `ManAndMachine-ADMS-Bridge` in a permanent folder, such as:
```text
C:\ManAndMachine-ADMS-Bridge
```

### Step 3 — Configure `.env`
1. Copy `.env.example` to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Open `.env` in Notepad and update:
   - `RENDER_BACKEND_URL` → your Render backend URL (must start with `https://`)
   - `BRIDGE_SHARED_SECRET` → **must match** `ADMS_SHARED_SECRET` on Render
   - `ALLOWED_DEVICE_SERIALS=TDDB250600919`
   - `ALLOWED_DEVICE_IPS=192.168.0.203,127.0.0.1`

### Step 4 — Configure Render Environment Variable
In your **Render Dashboard → Man & Machine Backend → Environment**:
- Add or verify `ADMS_SHARED_SECRET` matches `BRIDGE_SHARED_SECRET` in `.env`.
- Do **not** set `ADMS_ALLOWED_IPS` on Render to `192.168.0.203` (Render sees your gym's public internet IP, not the LAN IP; leave `ADMS_ALLOWED_IPS` empty on Render and let the local bridge enforce `192.168.0.203`).

### Step 5 — Test Locally Before Installing as a Service
Run the automated test suite:
```powershell
npm test
```
Start the bridge manually once to verify configuration:
```powershell
npm start
```
In another PowerShell window, check health:
```powershell
npm run status
```
Press `Ctrl+C` to stop the manual run.

### Step 6 — Configure Windows Firewall (Port 8081)
Open **PowerShell as Administrator** inside `ManAndMachine-ADMS-Bridge` and run:
```powershell
.\installer\configure-firewall.ps1
```
This opens inbound TCP port `8081` specifically for the eSSL X2008 (`192.168.0.203`).

### Step 7 — Install as an Auto-Starting Windows Service
In **PowerShell as Administrator**:
```powershell
.\installer\install-service.ps1
```
This installs `ManAndMachineADMSBridge` via WinSW, configures automatic startup + crash recovery, applies the firewall rule, and starts the service.

To start/stop/restart later, you can use `installer\start-service.bat`, `installer\stop-service.bat`, `installer\restart-service.bat`, or Windows `services.msc`.
To uninstall:
```powershell
.\installer\uninstall-service.ps1
```

### Step 8 — Configure the eSSL X2008 (Do NOT Erase Users!)
On the physical eSSL X2008 machine:
1. Press **M/OK** → **Comm.** → **Cloud Server Setting** (or **ADMS**).
2. Set:
   - **Server Mode**: `ADMS`
   - **Enable Domain Name**: `OFF`
   - **Server Address**: `<Windows 11 PC Static IP>` (e.g. `192.168.0.100`)
   - **Server Port**: `8081`
   - **HTTPS**: `OFF` (the bridge receives local LAN HTTP and upgrades to HTTPS to Render)
3. Save and exit. **Do not** reset or clear users/face templates on the device.

### Step 9 — Verify Live Connection
1. Run `npm run status` on the Windows 11 PC (or visit `http://127.0.0.1:8081/health`).
2. Confirm `devices` lists `TDDB250600919` with a recent `lastSeenAt`.
3. Perform one test face/finger punch on the X2008.
4. Confirm `queue.delivered` increments and the punch appears in the Man & Machine Admin dashboard.

---

## Troubleshooting

| Symptom | Cause & Fix |
|---|---|
| `npm run status` says bridge not reachable | Service is stopped. Run `installer\start-service.bat` as Administrator or check `logs\service\`. |
| `devices` is empty in `/health` | Check X2008 **Server Address** matches the Windows 11 PC static IP and **Port** is `8081`. Ensure `configure-firewall.ps1` was run. |
| `queue.pending` grows and `cloud.reachable` is `false` | Gym internet is down or Render is waking up. Events are safe in `./data/bridge.sqlite` and will auto-deliver when internet returns. |
| `HTTP 401` in `logs/` | `BRIDGE_SHARED_SECRET` in `.env` does not match `ADMS_SHARED_SECRET` on Render. |
| `HTTP 404` in `logs/` | Device serial `TDDB250600919` is not registered in the Man & Machine Admin **Biometric Devices** page. |
| `403 IP_NOT_ALLOWED` in `logs/` | X2008 IP changed from `192.168.0.203`. Update `ALLOWED_DEVICE_IPS` in `.env` and restart the service. |

---

## Daily Monitoring & Maintenance Commands

Run inside `ManAndMachine-ADMS-Bridge`:
- **Health check**: `npm run status` (or `Invoke-RestMethod http://127.0.0.1:8081/health`)
- **Queue inspection**: `npm run queue` (inspects SQLite outbox counts & any pending/failed events even when service is stopped)
- **Log inspection**: `npm run logs` (prints the latest 40 lines from `./logs/bridge-YYYY-MM-DD.log`; secrets are redacted)
- **Harden file permissions**: `.\installer\protect-files.ps1` (restricts `.env` and `data\` to `SYSTEM` and `Administrators`)

### Credential Rotation Procedure
1. Generate a new strong random secret.
2. Update `ADMS_SHARED_SECRET` in the Render Dashboard and redeploy/save.
3. Update `BRIDGE_SHARED_SECRET` in `.env` on the Windows 11 PC.
4. Run `installer\restart-service.bat` as Administrator. Any punches arriving during the restart window remain safely queued in SQLite and flush automatically once restarted.

---

## Tomorrow's Physical Testing Checklist

- [ ] Verify Windows 11 PC has Node.js 22.5+ (`node -v`) and a static LAN IP (e.g. `192.168.0.100`).
- [ ] Confirm `ADMS_SHARED_SECRET` is set on Render and matches `BRIDGE_SHARED_SECRET` in `.env`.
- [ ] Confirm `RENDER_BACKEND_URL` in `.env` is set to your real `https://...onrender.com` URL.
- [ ] Confirm `TDDB250600919` is registered and active in the Man & Machine Admin **Biometric Devices** page.
- [ ] Run `npm test` on the Windows 11 PC and confirm all simulated tests pass.
- [ ] Run `.\installer\install-service.ps1` as Administrator (installs service, hardens `.env`/`data/` ACLs, configures firewall for `192.168.0.203` on TCP `8081`).
- [ ] Confirm `npm run status` shows `status: healthy`.
- [ ] On the physical eSSL X2008 (`192.168.0.203`), configure **Cloud Server / ADMS** to the Windows 11 PC static IP, port `8081`, HTTPS `OFF` (**do NOT reset or erase existing face/fingerprint records**).
- [ ] Wait 30–60 seconds and run `npm run status` to confirm `TDDB250600919` appears in `devices`.
- [ ] Perform 1 real test punch on the X2008 and verify `npm run queue` shows `Delivered` incremented and the attendance record appears in Man & Machine.
- [ ] Disconnect the Windows 11 PC internet briefly, punch once on the X2008, verify `npm run queue` shows `Pending: 1`, reconnect internet, and verify it automatically delivers without duplicate attendance records.
