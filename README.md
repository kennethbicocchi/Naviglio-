# Naviglio

Parental control for Windows: block websites and require a password to temporarily unlock them.  
Works with **Chrome** and **Edge** via Native Messaging.

## Features
- Configurable blocked domain list (e.g., `instagram.com`, `tiktok.com`)
- Password required to unlock a domain for X minutes
- Elegant interstitial page shown before blocked sites load
- Local persistence (no data sent to servers)
- Optional **force-install policy** (no “Remove” button in extensions page, for managed environments)

## How it works
- The extension intercepts navigation requests.  
- If the domain is blocked and not unlocked, the user is redirected to an **interstitial** that asks for the password.  
- Password check, domain list, and unlocks are handled by a **.NET native host** via **Native Messaging**.  
- All data stays local (`C:\ProgramData\Naviglio\config.json`).

## Requirements
- Windows 10/11 (x64)
- Chrome 109+ / Edge 109+
- .NET 9 only for building from source (not needed with the installer)

## Installation (end-user)
1. Download the installer from the **Releases** page.
2. Run as **Administrator**.
3. Open `chrome://extensions` (or `edge://extensions`) and install Naviglio (from the Web Store or package).
4. Open **Options** in the extension:
   - set your password (default: `Naviglio`, change it immediately)
   - add domains to block
5. Visit a blocked domain → interstitial will appear.

### Anti-removal (optional)
On managed PCs, you can enable the **forcelist policy** to remove the “Remove” button in `chrome://extensions`.  
This is configured by the installer or via Group Policy (GPO).

## Build from source
### Native Host
```powershell
cd host\NaviglioHost
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
