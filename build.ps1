$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
  if (-not (Test-Path -LiteralPath 'node_modules\esbuild')) { & npm.cmd ci --no-audit --no-fund; if($LASTEXITCODE){throw 'npm ci failed'} }
  & npm.cmd run build
  if($LASTEXITCODE){throw 'Frontend build failed'}
  $v='1.0.3537.50'
  if(-not (Test-Path -LiteralPath 'sdk\lib\net462\Microsoft.Web.WebView2.Core.dll')){
    Invoke-WebRequest "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$v/microsoft.web.webview2.$v.nupkg" -OutFile wv.zip
    Expand-Archive -LiteralPath wv.zip -DestinationPath sdk -Force
  }
  $fw=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
  $http=Join-Path $env:WINDIR 'Microsoft.NET\assembly\GAC_MSIL\System.Net.Http\v4.0_4.0.0.0__b03f5f7f11d50a3a\System.Net.Http.dll'
  $core='sdk\lib\net462\Microsoft.Web.WebView2.Core.dll'
  $loader='sdk\runtimes\win-x64\native\WebView2Loader.dll'
  & "$fw\csc.exe" /nologo /optimize+ /target:winexe /platform:x64 /codepage:65001 /win32manifest:desktop.manifest /win32icon:Mark.ico /out:bin\Folio.exe /resource:ThirdPartyNotices.txt,ThirdPartyNotices.txt /resource:bin\index.html,index.html "/resource:$core,Microsoft.Web.WebView2.Core.dll" "/resource:$loader,WebView2Loader.dll" "/reference:$core" "/reference:$http" /reference:System.Security.dll /reference:System.Core.dll /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll Host.cs Storage.cs Summary.cs Preferences.cs ExplorerColumns.cs
  if($LASTEXITCODE){throw 'Desktop build failed'}
} finally {Pop-Location}
