<#
.SYNOPSIS
    Builds the release PhoneCam.exe into dist\.

.DESCRIPTION
    The result is one self-contained executable: the .NET runtime, adb, scrcpy-server, the
    WebView2 loader and the web page are all inside it, and it unpacks what must exist on disk
    into %LOCALAPPDATA%\PhoneCam\app on first start. The target PC needs nothing else.

    The executable records the git commit it was built from (in its product version), so a
    release build must start from a clean working tree: commit first, then publish, then tag
    that same commit.

.PARAMETER AllowDirty
    Build even with uncommitted changes, for local testing only.
#>
[CmdletBinding()]
param(
    [switch]$AllowDirty
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$changes = git -C $root status --porcelain
if ($changes -and -not $AllowDirty) {
    throw "Uncommitted changes: commit them first, so the executable matches its commit (or pass -AllowDirty for a test build).`n$($changes -join "`n")"
}

& (Join-Path $PSScriptRoot 'fetch-scrcpy.ps1')

$project = Join-Path $root 'src\PhoneCam\PhoneCam.csproj'
$dist = Join-Path $root 'dist'
if (Test-Path $dist) {
    Remove-Item $dist -Recurse -Force
}

# No native library is left in the bundle (see the csproj), so .NET extracts nothing to %TEMP%.
dotnet publish $project -c Release -r win-x64 --self-contained true -o $dist `
    -p:PublishSingleFile=true `
    -p:IncludeNativeLibrariesForSelfExtract=false `
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

$productVersion = (Get-Item $exe).VersionInfo.ProductVersion
$head = git -C $root rev-parse HEAD
Write-Host "Release build: $exe"
Write-Host "Version: $productVersion"
if ($changes) {
    Write-Warning 'Built with uncommitted changes: the commit in the version above does not describe this executable.'
} elseif (-not $productVersion.EndsWith("+$head")) {
    Write-Warning "The version does not end with the current commit $head."
}
Write-Host "SHA-256: $((Get-FileHash $exe -Algorithm SHA256).Hash.ToLowerInvariant())"
