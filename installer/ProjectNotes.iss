#ifndef AppVersion
  #define AppVersion "2.0.0"
#endif

[Setup]
AppId={{BCFE3E29-D932-4DC1-BAB6-808E80AD1FC4}
AppName=项目备注
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\ProjectNotes
DefaultGroupName=项目备注
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.17763
OutputDir=..\dist
OutputBaseFilename=ProjectNotes-Setup-{#AppVersion}-x64
SetupIconFile=..\Mark.ico
UninstallDisplayIcon={app}\ProjectNotes.exe
WizardStyle=modern
Compression=lzma2
SolidCompression=yes

[Files]
Source: "..\bin\ProjectNotes.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\ThirdPartyNotices.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{userprograms}\项目备注"; Filename: "{app}\ProjectNotes.exe"

[Run]
Filename: "{app}\ProjectNotes.exe"; Description: "打开项目备注"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{app}\ProjectNotes.exe"; Parameters: "--remove-menu"; Flags: runhidden; RunOnceId: "RemoveProjectNotesShellMenu"
