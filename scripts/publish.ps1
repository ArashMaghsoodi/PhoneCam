<#
.SYNOPSIS
    Builds the portable PhoneCam into dist\PhoneCam and zips it.

.DESCRIPTION
    The build is self-contained (the .NET runtime is inside PhoneCam.exe), so the target PC
    needs neither .NET nor an installer. adb, scrcpy-server and the web page stay as loose
    files next to the executable because they are started or served from disk.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot 'fetch-scrcpy.ps1')

$project = Join-Path $root 'src\PhoneCam\PhoneCam.csproj'
$version = ([xml](Get-Content $project -Raw)).Project.PropertyGroup.Version | Where-Object { $_ } | Select-Object -First 1
$dist = Join-Path $root 'dist'
$out = Join-Path $dist 'PhoneCam'
if (Test-Path $out) {
    Remove-Item $out -Recurse -Force
}

dotnet publish $project -c Release -r win-x64 --self-contained true -o $out `
    -p:PublishSingleFile=true `
    -p:IncludeNativeLibrariesForSelfExtract=true `
    -p:EnableCompressionInSingleFile=true `
    -p:DebugType=none
if ($LASTEXITCODE -ne 0) {
    throw 'dotnet publish failed'
}

Copy-Item (Join-Path $root 'LICENSE'), (Join-Path $root 'THIRD-PARTY-NOTICES.md') $out

$zip = Join-Path $dist "PhoneCam-$version-win-x64.zip"
if (Test-Path $zip) {
    Remove-Item $zip
}
Compress-Archive -Path $out -DestinationPath $zip
Write-Host "Portable build: $zip"
