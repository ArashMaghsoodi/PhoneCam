<#
.SYNOPSIS
    Builds the release PhoneCam.exe into dist\.

.DESCRIPTION
    The result is one self-contained executable: the .NET runtime, adb, scrcpy-server and the
    web page are all inside it, and it unpacks what must exist on disk into
    %LOCALAPPDATA%\PhoneCam\app on first start. The target PC needs nothing else.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot 'fetch-scrcpy.ps1')

$project = Join-Path $root 'src\PhoneCam\PhoneCam.csproj'
$dist = Join-Path $root 'dist'
if (Test-Path $dist) {
    Remove-Item $dist -Recurse -Force
}

dotnet publish $project -c Release -r win-x64 --self-contained true -o $dist `
    -p:PublishSingleFile=true `
    -p:IncludeNativeLibrariesForSelfExtract=true `
    -p:EnableCompressionInSingleFile=true `
    -p:DebugType=none
if ($LASTEXITCODE -ne 0) {
    throw 'dotnet publish failed'
}

$exe = Join-Path $dist 'PhoneCam.exe'
$unexpected = Get-ChildItem $dist -File | Where-Object Name -ne 'PhoneCam.exe'
if ($unexpected) {
    throw "Unexpected files next to PhoneCam.exe: $($unexpected.Name -join ', ')"
}
$hash = (Get-FileHash $exe -Algorithm SHA256).Hash.ToLowerInvariant()
Write-Host "Release build: $exe"
Write-Host "SHA-256: $hash"
