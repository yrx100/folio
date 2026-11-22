#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif
#ifndef BuildDir
  #define BuildDir "..\bin"
#endif

[Setup]
AppId={{BCFE3E29-D932-4DC1-BAB6-808E80AD1FC4}
AppName=Folio
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\Folio
DefaultGroupName=Folio
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.17763
OutputDir=..\dist
OutputBaseFilename=Folio-Setup-{#AppVersion}-x64
SetupIconFile=..\Mark.ico
UninstallDisplayIcon={app}\Folio.exe
WizardStyle=modern
Compression=lzma2
SolidCompression=yes

[InstallDelete]
Type: files; Name: "{userprograms}\项目备注.lnk"; Check: IsLegacyInstall
Type: files; Name: "{app}\ProjectNotes.exe"; Check: IsLegacyInstall

[Files]
Source: "{#BuildDir}\Folio.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#BuildDir}\FolioExplorer.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#BuildDir}\FolioExplorer.msix"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#BuildDir}\FolioLogo.png"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\ThirdPartyNotices.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{userprograms}\Folio"; Filename: "{app}\Folio.exe"

[Tasks]
Name: "explorer"; Description: "在资源管理器中添加 Folio 右键操作"

[Run]
Filename: "{app}\Folio.exe"; Parameters: "--register-menu"; Flags: runhidden; Tasks: explorer
Filename: "{app}\Folio.exe"; Parameters: "--remove-menu"; Flags: runhidden; Tasks: not explorer
Filename: "{app}\Folio.exe"; Description: "打开 Folio"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{app}\Folio.exe"; Parameters: "--remove-menu"; Flags: runhidden; RunOnceId: "RemoveProjectNotesShellMenu"

[Code]
function IsLegacyInstall: Boolean;
var
  PreviousPath: String;
begin
  Result :=
    RegQueryStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{BCFE3E29-D932-4DC1-BAB6-808E80AD1FC4}_is1',
      'Inno Setup: App Path', PreviousPath) and
    (CompareText(PreviousPath, ExpandConstant('{app}')) = 0) and
    FileExists(ExpandConstant('{app}\ProjectNotes.exe'));
end;
