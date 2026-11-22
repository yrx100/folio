$ErrorActionPreference = 'Stop'
$directory = $env:FOLIO_MENU_DIRECTORY
$action = $env:FOLIO_MENU_ACTION
$manager = [Windows.Management.Deployment.PackageManager, Windows.Management.Deployment, ContentType=WindowsRuntime]::new()
$packages = @(Get-AppxPackage -Name 'Folio.Explorer')

function Get-InstallLocation($package) {
    if (!$package) { return }
    $registered = $manager.FindPackageForUser('', $package.PackageFullName)
    return $registered.EffectiveExternalPath
}

$owned = @($packages | Where-Object { (Get-InstallLocation $_) -eq $directory })
if ($action -eq 'status') {
    if ($owned) { 'modern' }
    return
}
if ($action -eq 'remove') {
    $owned | ForEach-Object { Remove-AppxPackage -Package $_.PackageFullName }
    return
}

$path = Join-Path $directory 'FolioExplorer.msix'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($path)
try {
    $unsigned = $null -eq $archive.GetEntry('AppxSignature.p7x')
    $reader = [IO.StreamReader]::new($archive.GetEntry('AppxManifest.xml').Open())
    try {
        $identity = ([xml]$reader.ReadToEnd()).Package.Identity
    } finally {
        $reader.Dispose()
    }
} finally {
    $archive.Dispose()
}

$matching = $packages | Where-Object { $_.Publisher -eq $identity.Publisher -and "$($_.Version)" -eq $identity.Version }
$previousLocation = if ($matching) { Get-InstallLocation $matching }
if ($previousLocation -ne $directory) {
    $arguments = @{ Path = $path; ExternalLocation = $directory; ForceUpdateFromAnyVersion = $true }
    if ($unsigned) { $arguments.AllowUnsigned = $true }
    try {
        Add-AppxPackage @arguments
    } catch {
        # ERROR_PACKAGE_MOVE_FAILED is returned when the same identity has another external location.
        if (!$previousLocation -or $_.Exception.Message -notmatch '\b0x80073D0B\b') { throw }
    }

    $current = Get-AppxPackage -Name $identity.Name | Where-Object { $_.Publisher -eq $identity.Publisher }
    if ($matching -and (Get-InstallLocation $current) -eq $previousLocation) {
        # Windows can accept an identical package while leaving its previous external location in place.
        Remove-AppxPackage -Package $matching.PackageFullName
        try {
            Add-AppxPackage @arguments
        } catch {
            if (Test-Path -LiteralPath $previousLocation -PathType Container) {
                $arguments.ExternalLocation = $previousLocation
                Add-AppxPackage @arguments
            }
            throw
        }
    }
}

$current = Get-AppxPackage -Name $identity.Name | Where-Object { $_.Publisher -eq $identity.Publisher }
if (!$current -or (Get-InstallLocation $current) -ne $directory) {
    throw 'Windows did not register the Folio Explorer package to this installation.'
}
$owned | Where-Object { $_.Publisher -ne $identity.Publisher } |
    ForEach-Object { Remove-AppxPackage -Package $_.PackageFullName }
'modern'
