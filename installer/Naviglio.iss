#define AppName "Naviglio"
#define AppVersion "0.5.0"
#define AppPublisher "Tuo Nome o Azienda"
#define InstallDir "{pf}\Naviglio"
#define DataDir "{commonappdata}\Naviglio"

; ====== ID ESTENSIONI ======
; ChromeId = ID dello Store (obbligatorio per forcelist)
; EdgeId   = ID dello Store di Edge (opzionale; lascia "" se non pubblichi su Edge)
#define ChromeId "iieohflpfipinmlcligklljjehbpaihg"
#define EdgeId   "iieohflpfipinmlcligklljjehbpaihg"

[Setup]
AppId={{3C1F9C8E-2A0E-4B40-9B93-6F6B0E5B9F20}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={#InstallDir}
DisableDirPage=yes
DefaultGroupName={#AppName}
OutputDir=.
OutputBaseFilename=NaviglioSetup
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
WizardStyle=modern
SignedUninstaller=no

[Languages]
Name: "it"; MessagesFile: "compiler:Languages\Italian.isl"

[Tasks]
Name: "desktopicon"; Description: "Crea icona sul desktop"; GroupDescription: "Operazioni aggiuntive:"
Name: "openchromeext"; Description: "Apri pagina estensioni di Chrome al termine"; GroupDescription: "Dopo l’installazione:"
Name: "openedgeext";   Description: "Apri pagina estensioni di Edge al termine"; GroupDescription: "Dopo l’installazione:"

[Files]
; Host
Source: "host\AegisHost\bin\Release\net9.0\win-x64\publish\NaviglioHost.exe"; DestDir: "{#InstallDir}"; Flags: ignoreversion
; Estensione (tutta la cartella)
Source: "extension\*"; DestDir: "{#InstallDir}\Extension"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{#InstallDir}\NaviglioHost.exe"
Name: "{autodesktop}\{#AppName}"; Filename: "{#InstallDir}\NaviglioHost.exe"; Tasks: desktopicon

[Registry]
; Registrazione host nativo -> JSON in ProgramData (Chrome & Edge puntano allo stesso file)
Root: HKCU; Subkey: "Software\Google\Chrome\NativeMessagingHosts\com.naviglio.host"; ValueType: string; ValueName: ""; ValueData: "{#DataDir}\ChromeHost.json"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Microsoft\Edge\NativeMessagingHosts\com.naviglio.host";  ValueType: string; ValueName: ""; ValueData: "{#DataDir}\ChromeHost.json"; Flags: uninsdeletekey

[Run]
; Permessi scrittura su ProgramData\Naviglio (Users Modify) - evita "Access denied"
Filename: "{cmd}"; Parameters: "/c icacls ""{#DataDir}"" /grant *S-1-5-32-545:(OI)(CI)M /T"; Flags: runhidden
; Pagine estensioni (facoltative)
Filename: "cmd"; Parameters: "/c start chrome.exe chrome://extensions/"; Flags: postinstall nowait skipifsilent; Tasks: openchromeext
Filename: "cmd"; Parameters: "/c start msedge.exe edge://extensions/";  Flags: postinstall nowait skipifsilent; Tasks: openedgeext

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  jsonPath, jsonTxt, allowed: string;
  dataDir, exePath, escExePath: string;
  rc: Integer;
begin
  if CurStep = ssInstall then
  begin
    dataDir := ExpandConstant('{#DataDir}');
    exePath := ExpandConstant('{#InstallDir}\NaviglioHost.exe');

    if not DirExists(dataDir) then
      ForceDirectories(dataDir);

    { Compose allowed_origins JSON (Chrome + Edge, con slash finale) }
    allowed := '    "chrome-extension://{#ChromeId}/"';
    if '{#EdgeId}' <> '' then
      allowed := allowed + ','#13#10'    "chrome-extension://{#EdgeId}/"';

    { Escape backslash per JSON (\\) }
    escExePath := exePath;
    StringChange(escExePath, '\', '\\');

    jsonPath := dataDir + '\ChromeHost.json';
    jsonTxt :=
      '{'#13#10+
      '  "name": "com.naviglio.host",'#13#10+
      '  "description": "Naviglio Native Host",'#13#10+
      '  "path": "' + escExePath + '",'#13#10+
      '  "type": "stdio",'#13#10+
      '  "allowed_origins": ['#13#10+
      allowed + #13#10+
      '  ]'#13#10+
      '}';

    SaveStringToFile(jsonPath, jsonTxt, False);

    { (Ri)applica permessi cartella dati }
    Exec(ExpandConstant('{cmd}'),
      '/c icacls "' + dataDir + '" /grant *S-1-5-32-545:(OI)(CI)M /T',
      '', SW_HIDE, ewWaitUntilTerminated, rc);

    { -------------------- FORCELIST (niente bottone "Rimuovi") -------------------- }
    { Chrome Store: installazione forzata }
    RegWriteStringValue(HKLM,
      'Software\Policies\Google\Chrome\ExtensionInstallForcelist',
      '1',
      '{#ChromeId};https://clients2.google.com/service/update2/crx');

    { Edge Store: installazione forzata (solo se hai pubblicato su Edge) }
    if '{#EdgeId}' <> '' then
      RegWriteStringValue(HKLM,
        'Software\Policies\Microsoft\Edge\ExtensionInstallForcelist',
        '1',
        '{#EdgeId};https://edge.microsoft.com/extensionwebstorebase/v1/crx');
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
  begin
    { Rimuovi le forcelist a disinstallazione }
    RegDeleteValue(HKLM, 'Software\Policies\Google\Chrome\ExtensionInstallForcelist', '1');
    if '{#EdgeId}' <> '' then
      RegDeleteValue(HKLM, 'Software\Policies\Microsoft\Edge\ExtensionInstallForcelist', '1');
  end;
end;
