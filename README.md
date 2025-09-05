# Naviglio

**Naviglio** is a lightweight parental-control helper for Windows that blocks configured domains and requires a password to temporarily unlock access.  
It ships as a Chrome/Edge extension + a small Native Messaging Host for Windows.

## Features

- Block specific domains across all Chromium-based browsers
- Password-protected temporary unlock (e.g., 5/10/15 minutes)
- Options page protected by the same password
- Host-based safe storage (PBKDF2 + salt)
- Optional enterprise-style “force install” to hide the **Remove** button
- Minimal permissions (“nativeMessaging” only)

## How it works

1. The extension intercepts page loads (content script).
2. If the hostname matches your blocklist and there is no active unlock, an interstitial requests the password.
3. The extension talks to the Windows Native Host via Chrome Native Messaging.
4. The host validates the password, records unlock duration, and serves the blocklist.

## Repository layout

- `extension/` — Extension source code
- `host/` — Native host sample source (C#) *(optional; can be a README if you don’t publish source yet)*
- `installer/` — Inno Setup script (`NaviglioSetup.iss`)
- `releases/` — Optional folder for packaged installer / binaries

## Build & Install (quick)

1. **Windows Host**
   - Build `NaviglioHost.exe` (or use the packaged installer).
   - Installer registers the native host at:
     - `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.naviglio.host`
     - `HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.naviglio.host`
   - The JSON manifest points to the installed `NaviglioHost.exe`.

2. **Extension**
   - Load unpacked from `extension/` during development.
   - For Chrome Web Store, upload the zipped contents of `extension/` only.

## Permissions

Only:
```json
{
  "permissions": ["nativeMessaging"],
  "host_permissions": ["<all_urls>"]
}
