param(
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [string]$SigningThumbprint
)

$ErrorActionPreference = 'Stop'
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
if (!(Test-Path -LiteralPath $vswhere)) {
    throw 'Install Visual Studio Build Tools with the Desktop development with C++ workload and Windows SDK.'
}
$visualStudio = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (!$visualStudio) { throw 'Visual Studio C++ x64 build tools were not found.' }

$intermediate = Join-Path $OutputDirectory 'explorer-build'
$manifestDirectory = Join-Path $intermediate 'package'
New-Item -ItemType Directory -Force -Path $manifestDirectory | Out-Null
$manifest = [xml](Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'AppxManifest.xml'))
$version = (Get-Content -Raw -LiteralPath package.json | ConvertFrom-Json).version
$manifest.Package.Identity.Version = "$version.0"
if ($SigningThumbprint) {
    $certificate = Get-Item -LiteralPath "Cert:\CurrentUser\My\$SigningThumbprint"
    $manifest.Package.Identity.Publisher = $certificate.Subject
}
$manifest.Save((Join-Path $manifestDirectory 'AppxManifest.xml'))

Add-Type -AssemblyName System.Drawing
$icon = [Drawing.Icon]::new((Join-Path (Get-Location).Path 'Mark.ico'), 150, 150)
try {
    $image = $icon.ToBitmap()
    try {
        $image.Save((Join-Path $OutputDirectory 'FolioLogo.png'), [Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $image.Dispose()
    }
} finally {
    $icon.Dispose()
}

$toolsPath = $env:FOLIO_VCVARS_PATH
$outputPath = $env:FOLIO_EXPLORER_OUTPUT
$signingPath = $env:FOLIO_EXPLORER_THUMBPRINT
try {
    $env:FOLIO_VCVARS_PATH = Join-Path $visualStudio 'VC\Auxiliary\Build\vcvars64.bat'
    $env:FOLIO_EXPLORER_OUTPUT = $OutputDirectory
    # The executable and assets are in the external installation directory.
    $compile = 'cl.exe /nologo /W4 /WX /std:c++17 /utf-8 /EHsc /O2 /MT /LD /Fo"%FOLIO_EXPLORER_OUTPUT%\explorer-build\FolioExplorer.obj" explorer\FolioExplorer.cpp /link /DEF:explorer\FolioExplorer.def /OUT:"%FOLIO_EXPLORER_OUTPUT%\FolioExplorer.dll" /IMPLIB:"%FOLIO_EXPLORER_OUTPUT%\explorer-build\FolioExplorer.lib" ole32.lib shell32.lib shlwapi.lib uuid.lib runtimeobject.lib'
    $pack = 'makeappx.exe pack /nv /o /d "%FOLIO_EXPLORER_OUTPUT%\explorer-build\package" /p "%FOLIO_EXPLORER_OUTPUT%\FolioExplorer.msix"'
    & cmd.exe /d /s /c ('""%FOLIO_VCVARS_PATH%" >nul && ' + $compile + ' && ' + $pack + '"')
    if ($LASTEXITCODE) { throw 'Explorer extension build failed.' }
    if ($SigningThumbprint) {
        $env:FOLIO_EXPLORER_THUMBPRINT = $certificate.Thumbprint
        & cmd.exe /d /s /c '""%FOLIO_VCVARS_PATH%" >nul && signtool.exe sign /fd SHA256 /sha1 "%FOLIO_EXPLORER_THUMBPRINT%" "%FOLIO_EXPLORER_OUTPUT%\FolioExplorer.msix""'
        if ($LASTEXITCODE) { throw 'Explorer package signing failed.' }
    }
} finally {
    $env:FOLIO_VCVARS_PATH = $toolsPath
    $env:FOLIO_EXPLORER_OUTPUT = $outputPath
    $env:FOLIO_EXPLORER_THUMBPRINT = $signingPath
}
