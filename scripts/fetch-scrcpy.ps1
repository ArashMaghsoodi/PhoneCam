<#
.SYNOPSIS
    Downloads the scrcpy Windows release that PhoneCam builds against and verifies its SHA-256.

.DESCRIPTION
    PhoneCam only needs adb.exe, its two DLLs and scrcpy-server from that package.
    They are extracted to third_party/, which is not stored in the repository.
#>
[CmdletBinding()]
param(
    [string]$Version = '4.1'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$thirdParty = Join-Path (Split-Path -Parent $PSScriptRoot) 'third_party'
$name = "scrcpy-win64-v$Version"
if (Test-Path (Join-Path $thirdParty "$name\scrcpy-server")) {
    Write-Host "$name is already present."
    return
}

New-Item -ItemType Directory -Force $thirdParty | Out-Null
$baseUrl = "https://github.com/Genymobile/scrcpy/releases/download/v$Version"
$zip = Join-Path $thirdParty "$name.zip"
$sums = Join-Path $thirdParty "SHA256SUMS-v$Version.txt"

Write-Host "Downloading $name.zip..."
Invoke-WebRequest "$baseUrl/$name.zip" -OutFile $zip -UseBasicParsing
Invoke-WebRequest "$baseUrl/SHA256SUMS.txt" -OutFile $sums -UseBasicParsing

$line = Get-Content $sums | Where-Object { $_ -match "\s$([regex]::Escape("$name.zip"))$" } | Select-Object -First 1
if (-not $line) {
    throw "SHA256SUMS.txt has no entry for $name.zip"
}
$expected = ($line -split '\s+')[0]
$actual = (Get-FileHash $zip -Algorithm SHA256).Hash
if ($actual -ne $expected) {
    Remove-Item $zip
    throw "SHA-256 mismatch for $name.zip (expected $expected, got $actual)"
}

Expand-Archive $zip -DestinationPath $thirdParty -Force
Write-Host "$name downloaded and verified."
