param(
    [string]$InnoCompiler,
    [string]$OutputDirectory = (Join-Path $PSScriptRoot 'bin'),
    [string]$ExplorerSigningThumbprint
)

$ErrorActionPreference = 'Stop'
$version = (Get-Content -Raw (Join-Path $PSScriptRoot 'package.json') | ConvertFrom-Json).version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw "Unsupported installer version: $version" }

if (!$InnoCompiler) {
    $command = Get-Command ISCC.exe -ErrorAction SilentlyContinue
    $locations = @(
        $command.Source
        (Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe')
        (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 6\ISCC.exe')
    )
    $InnoCompiler = $locations | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
}
if (!$InnoCompiler -or !(Test-Path -LiteralPath $InnoCompiler -PathType Leaf)) {
    throw 'Inno Setup 6 compiler not found. Set -InnoCompiler to the full path to ISCC.exe.'
}

$OutputDirectory = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDirectory)
& (Join-Path $PSScriptRoot 'build.ps1') -OutputDirectory $OutputDirectory -ExplorerSigningThumbprint $ExplorerSigningThumbprint
& $InnoCompiler "/DAppVersion=$version" "/DBuildDir=$OutputDirectory" (Join-Path $PSScriptRoot 'installer\Folio.iss')
if ($LASTEXITCODE -ne 0) { throw "Inno Setup failed with exit code $LASTEXITCODE" }
$file = Get-Item -LiteralPath (Join-Path $PSScriptRoot "dist\Folio-Setup-$version-x64.exe")
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash.ToLowerInvariant()
"$hash  $($file.Name)" | Set-Content -LiteralPath "$($file.FullName).sha256" -Encoding ascii
