# build-agent.ps1
# Compile ShinseiBoot.java et produit shinsei-boot.jar dans .shinsei\
# Usage : .\build-agent.ps1

$ErrorActionPreference = 'Stop'
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$SrcFile    = Join-Path $ScriptDir 'ShinseiBoot.java'
$ManifestF  = Join-Path $ScriptDir 'MANIFEST.MF'
$OutDir     = Join-Path $ScriptDir 'agent-out'
$JarDest    = Join-Path $env:APPDATA '.shinsei\shinsei-boot.jar'

# ── Trouver javac ─────────────────────────────────────────────────────────────
$JavaC = $null
$JavaBin = $null

$candidates = @(
    'C:\Program Files\Eclipse Adoptium\jdk-21*\bin\javac.exe',
    'C:\Program Files\Eclipse Adoptium\jdk-17*\bin\javac.exe',
    'C:\Program Files\Microsoft\jdk-21*\bin\javac.exe',
    'C:\Program Files\Microsoft\jdk-17*\bin\javac.exe',
    'C:\Program Files\Java\jdk-21*\bin\javac.exe',
    'C:\Program Files\Java\jdk-17*\bin\javac.exe',
    'C:\Program Files\Zulu\zulu-21*\bin\javac.exe',
    'C:\Program Files\Zulu\zulu-17*\bin\javac.exe'
)
foreach ($pat in $candidates) {
    $hit = Get-Item $pat -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($hit) { $JavaC = $hit.FullName; $JavaBin = Split-Path $hit.FullName; break }
}

if (-not $JavaC) {
    $cmd = Get-Command javac -ErrorAction SilentlyContinue
    if ($cmd) { $JavaC = $cmd.Source; $JavaBin = Split-Path $JavaC }
}

if (-not $JavaC) {
    Write-Error "javac introuvable. Installe JDK 17+ et assure-toi qu'il est dans le PATH."
    exit 1
}

$JarExe = Join-Path $JavaBin 'jar.exe'
if (-not (Test-Path $JarExe)) { $JarExe = 'jar' }

Write-Host "javac  : $JavaC"
Write-Host "jar    : $JarExe"
Write-Host "source : $SrcFile"
Write-Host "dest   : $JarDest"
Write-Host ''

# ── Compilation ───────────────────────────────────────────────────────────────
if (Test-Path $OutDir) { Remove-Item $OutDir -Recurse -Force }
New-Item -ItemType Directory -Force $OutDir | Out-Null

& $JavaC -source 11 -target 11 -d $OutDir $SrcFile
if ($LASTEXITCODE -ne 0) { Write-Error "Compilation echouee."; exit 1 }
Write-Host "Compilation OK"

# ── Packaging ─────────────────────────────────────────────────────────────────
$ShinseiDir = Join-Path $env:APPDATA '.shinsei'
if (-not (Test-Path $ShinseiDir)) { New-Item -ItemType Directory -Force $ShinseiDir | Out-Null }

& $JarExe cfm $JarDest $ManifestF -C $OutDir .
if ($LASTEXITCODE -ne 0) { Write-Error "Packaging echoue."; exit 1 }

Write-Host "Jar cree : $JarDest"
Write-Host ''
Write-Host "Relance le launcher — -javaagent sera detecte automatiquement."
