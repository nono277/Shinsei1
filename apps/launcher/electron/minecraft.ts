import { spawn, exec, execFile }  from 'child_process'
import { join, delimiter }         from 'path'
import { mkdir, readFile, access, writeFile, copyFile, unlink, stat, readdir } from 'fs/promises'
import { createWriteStream }       from 'fs'
import { promisify }               from 'util'
import * as https                  from 'https'
import * as http                   from 'http'
import * as os                     from 'os'
import { app, screen as electronScreen } from 'electron'

const execAsync = promisify(exec)

// ── Configuration ─────────────────────────────────────────────────────────────
const MC_VERSION      = '1.21.1'
const FORGE_FALLBACK  = '52.0.47'   // utilisé si l'API promotions est inaccessible
// ──────────────────────────────────────────────────────────────────────────────

export interface LaunchOptions {
  username:    string
  uuid:        string
  accessToken: string
  javaPath:    string
  ramGb:       number
  resolution?: string
  onProgress:  (label: string, percent: number) => void
  onLog:       (line: string) => void
  onCrash?:    (error: string) => void
  onExit?:     () => void
}

// ── Chemins ───────────────────────────────────────────────────────────────────

function getMinecraftDir(): string {
  switch (process.platform) {
    case 'win32':  return join(process.env.APPDATA ?? os.homedir(), '.shinsei')
    case 'darwin': return join(os.homedir(), 'Library', 'Application Support', 'shinsei')
    default:       return join(os.homedir(), '.shinsei')
  }
}

const MC_DIR       = getMinecraftDir()
const VERSIONS_DIR = join(MC_DIR, 'versions')
const LIBS_DIR     = join(MC_DIR, 'libraries')
const ASSETS_DIR   = join(MC_DIR, 'assets')
const GAME_DIR     = MC_DIR

// ── Helpers ───────────────────────────────────────────────────────────────────

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true })
}

async function copyDir(src: string, dest: string): Promise<void> {
  await ensureDir(dest)
  for (const entry of await readdir(src, { withFileTypes: true })) {
    const s = join(src, entry.name)
    const d = join(dest, entry.name)
    if (entry.isDirectory()) await copyDir(s, d)
    else await copyFile(s, d)
  }
}

async function fileExists(p: string): Promise<boolean> {
  try { await access(p); return true } catch { return false }
}

function downloadFile(
  url:         string,
  dest:        string,
  onProgress?: (ratio: number) => void,
  timeoutMs  = 60_000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const get = (u: string, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Trop de redirections'))
      const mod = u.startsWith('https') ? https : http
      const req = mod.get(u, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.headers.location) {
          res.resume()
          return get(res.headers.location, redirects + 1)
        }
        if (res.statusCode && res.statusCode >= 400) {
          res.resume()
          return reject(new Error(`HTTP ${res.statusCode} pour ${u}`))
        }
        const total = parseInt(res.headers['content-length'] ?? '0', 10)
        let got = 0
        const ws = createWriteStream(dest)
        res.on('data', (chunk: Buffer) => {
          got += chunk.length
          if (total > 0) onProgress?.(got / total)
        })
        res.pipe(ws)
        ws.on('finish', resolve)
        ws.on('error',  reject)
        res.on('error', reject)
      })
      req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error(`Timeout: ${u}`)) })
      req.on('error', reject)
    }
    get(url)
  })
}

// Convertit une coordonnée Maven en chemin relatif
function mavenToPath(name: string): string {
  const parts      = name.split(':')
  const group      = parts[0].replace(/\./g, '/')
  const artifact   = parts[1]
  const version    = parts[2]
  const classifier = parts[3] ? `-${parts[3]}` : ''
  return `${group}/${artifact}/${version}/${artifact}-${version}${classifier}.jar`
}

async function extractNatives(jarPath: string, destDir: string): Promise<void> {
  try {
    if (process.platform === 'win32') {
      await execAsync(
        `powershell -NoProfile -Command ` +
        `"Add-Type -Assembly System.IO.Compression.FileSystem;` +
        `$z=[System.IO.Compression.ZipFile]::OpenRead('${jarPath.replace(/\\/g, '\\\\').replace(/'/g, "''")}');` +
        `foreach($e in $z.Entries){` +
          `if($e.Name -match '\\.(dll|exe)$'){` +
            `$d='${destDir.replace(/\\/g, '\\\\').replace(/'/g, "''")}\\\\'+$e.Name;` +
            `[System.IO.Compression.ZipFileExtensions]::ExtractToFile($e,$d,$true)` +
          `}` +
        `};$z.Dispose()"`
      )
    } else {
      await execAsync(`unzip -o "${jarPath}" "*.so" "*.dylib" -d "${destDir}" 2>/dev/null; true`)
    }
  } catch { /* ignorer les JARs sans natives */ }
}

// ── Métadonnées Mojang ────────────────────────────────────────────────────────

async function fetchVanillaMeta(): Promise<any> {
  const cachedPath = join(VERSIONS_DIR, MC_VERSION, `${MC_VERSION}.json`)
  if (await fileExists(cachedPath)) {
    return JSON.parse(await readFile(cachedPath, 'utf-8'))
  }
  const manifest = await fetch(
    'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
  ).then(r => r.json()) as any

  const entry = (manifest.versions as any[]).find(v => v.id === MC_VERSION)
  if (!entry) throw new Error(`Version ${MC_VERSION} introuvable dans le manifest Mojang`)

  const meta = await fetch(entry.url).then(r => r.json())
  await ensureDir(join(VERSIONS_DIR, MC_VERSION))
  await writeFile(cachedPath, JSON.stringify(meta, null, 2))
  return meta
}

// ── Métadonnées Forge ─────────────────────────────────────────────────────────

async function getForgeLatestVersion(): Promise<string> {
  const cachePath = join(VERSIONS_DIR, `forge-latest-${MC_VERSION}.txt`)
  if (await fileExists(cachePath)) {
    return (await readFile(cachePath, 'utf-8')).trim()
  }
  try {
    const promos = await fetch(
      'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json'
    ).then(r => r.json()) as { promos: Record<string, string> }

    const ver = promos.promos[`${MC_VERSION}-latest`]
             ?? promos.promos[`${MC_VERSION}-recommended`]
    if (ver) {
      await writeFile(cachePath, ver)
      return ver
    }
  } catch { /* API inaccessible */ }
  return FORGE_FALLBACK
}

function forgeId(forgeVer: string): string {
  return `${MC_VERSION}-forge-${forgeVer}`
}

async function isForgeInstalled(forgeVer: string): Promise<boolean> {
  const id      = forgeId(forgeVer)
  const jsonPath = join(VERSIONS_DIR, id, `${id}.json`)
  if (!await fileExists(jsonPath)) return false
  if (!await fileExists(join(VERSIONS_DIR, MC_VERSION, `${MC_VERSION}.jar`))) return false

  // Vérifier que les libs créées localement par le Forge installer existent bien
  // (celles sans URL dans le profil ne peuvent pas être re-téléchargées)
  try {
    const profile = JSON.parse(await readFile(jsonPath, 'utf-8'))
    for (const lib of (profile.libraries ?? []) as any[]) {
      const artifact = lib.downloads?.artifact
      if (!artifact?.path) continue
      if (artifact.url && (artifact.url as string).trim().length > 0) continue
      if (!await fileExists(join(LIBS_DIR, artifact.path))) return false
    }
  } catch { return false }

  return true
}

async function runForgeInstaller(
  javaExe:    string,
  forgeVer:   string,
  onProgress: (label: string, pct: number) => void,
  onLog?:     (line: string) => void
): Promise<void> {
  const id           = `${MC_VERSION}-${forgeVer}`
  const installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${id}/forge-${id}-installer.jar`
  const installerJar = join(LIBS_DIR, `forge-${id}-installer.jar`)

  await ensureDir(LIBS_DIR)

  if (!await fileExists(installerJar)) {
    onProgress('Téléchargement de Forge Installer…', 55)
    await downloadFile(installerUrl, installerJar, (r) =>
      onProgress('Forge Installer', 55 + r * 4), 120_000
    )
  }

  onProgress('Installation de Forge (1–3 min)…', 60)

  // Le Forge installer exige un launcher_profiles.json dans le répertoire cible
  const profilesPath = join(MC_DIR, 'launcher_profiles.json')
  if (!await fileExists(profilesPath)) {
    await writeFile(profilesPath, JSON.stringify({
      profiles: { '(Default)': { name: '(Default)', type: 'latest-release' } },
      selectedProfile: '(Default)',
      authenticationDatabase: {},
      clientToken: 'shinsei-launcher',
    }, null, 2))
  }

  // Utiliser java (pas javaw) pour capturer la sortie du processus installeur
  const java     = javaExe.replace(/javaw(\.exe)?$/i, (_, ext) => `java${ext ?? ''}`)
  const javaHome = java.replace(/[/\\]bin[/\\]java(\.exe)?$/i, '')

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(java, [
      '-Dfile.encoding=UTF-8',
      '-Dstdout.encoding=UTF-8',
      '-Dstderr.encoding=UTF-8',
      '-jar', installerJar, '--installClient', MC_DIR,
    ], {
      stdio: 'pipe',
      cwd:   MC_DIR,
      env:   { ...process.env, JAVA_HOME: javaHome },
    })

    const timeout = setTimeout(() => {
      proc.kill()
      reject(new Error("Installation de Forge expirée (15 min). Réessaie sur une meilleure connexion."))
    }, 15 * 60 * 1000)

    const allLines: string[] = []
    let pct = 60
    // Heartbeat : empêche la barre de progresser de se bloquer quand l'installer
    // télécharge silencieusement sans émettre de logs
    const heartbeat = setInterval(() =>
      onProgress('Installation Forge en cours (peut prendre plusieurs minutes)…', Math.min(pct, 89)),
    6000)

    const pushLine = (d: Buffer) => {
      const line = d.toString('utf-8').trim()
      if (!line) return
      allLines.push(line)
      onLog?.(line)
      onProgress(line.slice(0, 70), Math.min(++pct, 92))
    }
    proc.stdout?.on('data', pushLine)
    proc.stderr?.on('data', pushLine)

    proc.on('error', err => {
      clearInterval(heartbeat)
      clearTimeout(timeout)
      reject(new Error(
        err.message.includes('ENOENT')
          ? `Java introuvable : "${java}" — Installe Java 21 ou corrige le chemin dans Paramètres`
          : `Erreur lancement installeur Forge : ${err.message}`
      ))
    })
    proc.on('close', code => {
      clearInterval(heartbeat)
      clearTimeout(timeout)
      if (code === 0) { resolve(); return }
      const detail = allLines
        .filter(l => /error|fail|exception/i.test(l) && !/WindowsPreferences|registr/i.test(l))
        .slice(-5)
        .join('\n')
      reject(new Error(
        `Forge Installer a échoué (code ${code}).\n` +
        `Vérifie que Java 21 64-bit est installé et configuré dans Paramètres.` +
        (detail ? `\n\n${detail}` : '')
      ))
    })
  })
}

async function loadForgeProfile(forgeVer: string): Promise<any> {
  const id = forgeId(forgeVer)
  return JSON.parse(await readFile(join(VERSIONS_DIR, id, `${id}.json`), 'utf-8'))
}

// ── Librairies ────────────────────────────────────────────────────────────────

function isOSAllowed(lib: any): boolean {
  if (!lib.rules) return true
  const os = process.platform === 'win32' ? 'windows'
           : process.platform === 'darwin' ? 'osx' : 'linux'
  let allowed = false
  for (const rule of lib.rules) {
    if (rule.features) continue
    if (rule.action === 'allow'    && !rule.os)                return true
    if (rule.action === 'allow'    && rule.os?.name === os)    allowed = true
    if (rule.action === 'disallow' && rule.os?.name === os)    return false
  }
  return allowed
}

async function downloadVanillaLibraries(
  libs:      any[],
  onProgress: (label: string, pct: number) => void
): Promise<string[]> {
  const classpath: string[] = []
  const allowed = libs.filter(isOSAllowed)

  for (let i = 0; i < allowed.length; i++) {
    const lib      = allowed[i]
    const artifact = lib.downloads?.artifact
    if (!artifact?.path) continue

    const libPath = join(LIBS_DIR, artifact.path)
    await ensureDir(join(libPath, '..'))

    if (!await fileExists(libPath)) {
      onProgress(`Lib ${lib.name.split(':')[1]}`, 12 + (i / allowed.length) * 30)
      await downloadFile(artifact.url, libPath)
    }
    classpath.push(libPath)

    const osName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux'
    const natKey = lib.natives?.[osName]?.replace('${arch}', process.arch === 'x64' ? '64' : '32')
    if (natKey && lib.downloads?.classifiers?.[natKey]) {
      const nat     = lib.downloads.classifiers[natKey]
      const natPath = join(LIBS_DIR, nat.path)
      await ensureDir(join(natPath, '..'))
      if (!await fileExists(natPath)) await downloadFile(nat.url, natPath)
      classpath.push(natPath)
    }
  }
  return classpath
}

async function downloadForgeLibraries(
  libs:      any[],
  onProgress: (label: string, pct: number) => void
): Promise<string[]> {
  const classpath: string[] = []
  const FORGE_MAVEN = 'https://maven.minecraftforge.net'
  const CENTRAL     = 'https://repo1.maven.org/maven2'

  for (let i = 0; i < libs.length; i++) {
    const lib = libs[i]
    if (!isOSAllowed(lib)) continue

    // Priorité : downloads.artifact (URL directe fournie par le profil)
    const artifact = lib.downloads?.artifact
    if (artifact?.path) {
      const libPath = join(LIBS_DIR, artifact.path)
      await ensureDir(join(libPath, '..'))
      if (!await fileExists(libPath) && artifact.url) {
        onProgress(`Forge: ${lib.name?.split(':')[1] ?? artifact.path}`, 65 + (i / libs.length) * 20)
        await downloadFile(artifact.url, libPath)
      }
      if (await fileExists(libPath)) classpath.push(libPath)
      continue
    }

    // Fallback : construire depuis le nom Maven
    if (!lib.name) continue
    const rel     = mavenToPath(lib.name)
    const libPath = join(LIBS_DIR, rel)
    await ensureDir(join(libPath, '..'))

    if (!await fileExists(libPath)) {
      onProgress(`Forge: ${lib.name.split(':')[1]}`, 65 + (i / libs.length) * 20)
      // Essayer Forge Maven puis Maven Central
      const baseUrl = lib.url?.replace(/\/$/, '') ?? FORGE_MAVEN
      try {
        await downloadFile(`${baseUrl}/${rel}`, libPath)
      } catch {
        try {
          await downloadFile(`${CENTRAL}/${rel}`, libPath)
        } catch { /* lib introuvable — non bloquant */ }
      }
    }
    if (await fileExists(libPath)) classpath.push(libPath)
  }
  return classpath
}

// ── Assets ────────────────────────────────────────────────────────────────────

async function downloadAssets(
  meta:      any,
  onProgress: (label: string, pct: number) => void
): Promise<void> {
  const indexDir  = join(ASSETS_DIR, 'indexes')
  const objectDir = join(ASSETS_DIR, 'objects')
  await ensureDir(indexDir)
  await ensureDir(objectDir)

  const indexFile = join(indexDir, `${meta.assetIndex.id}.json`)
  if (!await fileExists(indexFile)) {
    onProgress('Index des assets', 43)
    await downloadFile(meta.assetIndex.url, indexFile)
  }

  const index   = JSON.parse(await readFile(indexFile, 'utf-8'))
  const entries = Object.values(index.objects) as { hash: string }[]
  let done = 0
  const BATCH = 10

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH)
    await Promise.all(batch.map(async ({ hash }) => {
      const prefix    = hash.slice(0, 2)
      const assetPath = join(objectDir, prefix, hash)
      if (!await fileExists(assetPath)) {
        await ensureDir(join(objectDir, prefix))
        await downloadFile(
          `https://resources.download.minecraft.net/${prefix}/${hash}`,
          assetPath
        )
      }
      done++
    }))
    onProgress(`Assets ${done}/${entries.length}`, 44 + (done / entries.length) * 10)
  }
}

// ── Écran de chargement custom ────────────────────────────────────────────────

async function deployLoadingScreenConfig(): Promise<void> {
  const configDir      = join(MC_DIR, 'config')
  const fancyAssetsDir = join(configDir, 'fancymenu', 'assets')
  const fancyCustomDir = join(configDir, 'fancymenu', 'customization')
  const drippyDir      = join(configDir, 'drippyloadingscreen')

  await ensureDir(fancyAssetsDir)
  await ensureDir(fancyCustomDir)
  await ensureDir(drippyDir)

  const srcPng  = join(app.getAppPath(), 'src', 'img', 'loading', 'loading.png')
  const destPng = join(fancyAssetsDir, 'loading.png')
  if (await fileExists(srcPng)) {
    await copyFile(srcPng, destPng)
    // Chemin stable pour le Java agent (hors de fancymenu)
    const agentPng = join(MC_DIR, 'shinsei-loading.png')
    if (!await fileExists(agentPng)) await copyFile(srcPng, agentPng)
  }

  const bgPath      = destPng.replace(/\\/g, '/')
  const barCyanPath = join(fancyAssetsDir, 'bar_cyan.png').replace(/\\/g, '/')
  const barDarkPath = join(fancyAssetsDir, 'bar_dark.png').replace(/\\/g, '/')

  await writeFile(join(drippyDir, 'options.txt'),
`##[general]

B:early_fade_out_elements = 'true';
B:allow_universal_layouts = 'true';
B:fade_out_loading_screen = 'true';
B:wait_for_textures_in_loading = 'true';


##[early_loading]

I:early_loading_top_right_watermark_position_offset_y = '0';
I:early_loading_bottom_left_watermark_position_offset_x = '0';
I:early_loading_bottom_left_watermark_position_offset_y = '0';
B:early_loading_hide_logger = 'true';
I:early_loading_bar_width = '-1';
I:early_loading_bar_position_offset_y = '0';
I:early_loading_top_right_watermark_height = '100';
I:early_loading_top_right_watermark_position_offset_x = '0';
I:early_loading_bottom_right_watermark_height = '100';
I:early_loading_bar_position_offset_x = '0';
I:early_loading_logo_height = '120';
I:early_loading_top_right_watermark_width = '100';
I:early_loading_bottom_right_watermark_position_offset_y = '0';
I:early_loading_window_height = '-1';
S:early_loading_bar_progress_texture_path = '${barCyanPath}';
I:early_loading_bottom_right_watermark_position_offset_x = '0';
S:early_loading_background_texture_path = '${bgPath}';
B:early_loading_background_preserve_aspect_ratio = 'false';
I:early_loading_top_left_watermark_width = '100';
B:early_loading_hide_logo = 'true';
S:early_loading_bar_background_texture_path = '${barDarkPath}';
I:early_loading_top_left_watermark_position_offset_y = '0';
I:early_loading_top_left_watermark_position_offset_x = '0';
I:early_loading_logo_width = '480';
I:early_loading_bottom_left_watermark_width = '100';
I:early_loading_bottom_right_watermark_width = '100';
I:early_loading_bottom_left_watermark_height = '100';
I:early_loading_bar_height = '6';
S:early_loading_window_title = 'SHINSEI';
I:early_loading_top_left_watermark_height = '100';
I:early_loading_window_width = '-1';
I:early_loading_logo_position_offset_y = '-50';
B:early_loading_hide_bar = 'false';
I:early_loading_logo_position_offset_x = '0';`)
}

// ── Compilation du Java agent (une seule fois) ────────────────────────────────

const AGENT_VERSION = '8' // incrémenter à chaque modification de ShinseiBootAgent.java
const MOD_VERSION   = '35' // incrémenter à chaque modification de ShinseiMenuMod.java

async function buildBootAgent(javaExe: string): Promise<void> {
  const agentJar  = join(MC_DIR, 'shinsei-boot.jar')
  const verFile   = join(MC_DIR, 'shinsei-boot.ver')
  const curVer    = await fileExists(verFile) ? (await readFile(verFile, 'utf-8')).trim() : ''

  // Recompiler uniquement si la version a changé
  if (await fileExists(agentJar) && curVer === AGENT_VERSION) return

  const srcFile = join(app.getAppPath(), 'resources', 'shinsei-agent', 'ShinseiBootAgent.java')
  if (!await fileExists(srcFile)) return

  const binDir = javaExe.replace(/[^/\\]+$/, '')
  const ext    = process.platform === 'win32' ? '.exe' : ''
  const javac  = binDir + 'javac' + ext
  const jarCmd = binDir + 'jar'   + ext
  if (!await fileExists(javac)) return

  const tmpDir   = join(MC_DIR, '_agent_build')
  const classDir = join(tmpDir, 'classes')
  const manifest = join(tmpDir, 'MANIFEST.MF')

  try {
    await ensureDir(classDir)
    await writeFile(manifest, 'Premain-Class: ShinseiBootAgent\nCan-Retransform-Classes: true\n')
    await execAsync(`"${javac}" --release 11 -d "${classDir}" "${srcFile}"`)
    await execAsync(`"${jarCmd}" cfm "${agentJar}" "${manifest}" -C "${classDir}" .`)
    await writeFile(verFile, AGENT_VERSION)
  } catch { /* agent optionnel — ne bloque pas le lancement */ } finally {
    try {
      await execAsync(process.platform === 'win32'
        ? `rmdir /s /q "${tmpDir}"` : `rm -rf "${tmpDir}"`)
    } catch { /* ignore */ }
  }
}

// ── Mod menu personnalisé ─────────────────────────────────────────────────────

async function buildMenuMod(
  javaExe:  string,
  classpath: string[],
  onLog:    (line: string) => void
): Promise<void> {
  const modJar  = join(MC_DIR, 'shinsei-menu.jar')
  const verFile = join(MC_DIR, 'shinsei-menu.ver')
  const curVer  = await fileExists(verFile) ? (await readFile(verFile, 'utf-8')).trim() : ''

  if (await fileExists(modJar) && curVer === MOD_VERSION) {
    onLog('[mod] shinsei-menu.jar à jour, pas de recompilation.')
    return
  }

  const srcFile = join(app.getAppPath(), 'resources', 'shinsei-mod', 'ShinseiMenuMod.java')
  const tomlSrc = join(app.getAppPath(), 'resources', 'shinsei-mod', 'mods.toml')
  if (!await fileExists(srcFile)) {
    onLog(`[mod] Source introuvable : ${srcFile}`)
    return
  }

  const binDir = javaExe.replace(/[^/\\]+$/, '')
  const ext    = process.platform === 'win32' ? '.exe' : ''
  const javac  = binDir + 'javac' + ext
  const jarCmd = binDir + 'jar'   + ext
  if (!await fileExists(javac)) {
    onLog(`[mod] javac introuvable : ${javac}`)
    return
  }

  onLog('[mod] Compilation de ShinseiMenuMod…')

  const execFileAsync = promisify(execFile)

  const tmpDir   = join(MC_DIR, '_mod_build')
  const classDir = join(tmpDir, 'classes')
  const metaDir  = join(classDir, 'META-INF')
  const manifest = join(tmpDir, 'MANIFEST.MF')

  try {
    await ensureDir(classDir)
    await ensureDir(metaDir)
    await writeFile(manifest, 'Manifest-Version: 1.0\n')
    if (await fileExists(tomlSrc)) await copyFile(tomlSrc, join(metaDir, 'mods.toml'))
    const packMeta = join(app.getAppPath(), 'resources', 'shinsei-mod', 'pack.mcmeta')
    if (await fileExists(packMeta)) await copyFile(packMeta, join(classDir, 'pack.mcmeta'))

    // Copy mod assets (sounds.json, sound files, etc.) into the JAR
    const assetsDir = join(app.getAppPath(), 'resources', 'shinsei-mod', 'assets')
    if (await fileExists(assetsDir)) await copyDir(assetsDir, join(classDir, 'assets'))

    // execFile bypasse cmd.exe (limite 8K) → pas de problème de longueur de ligne
    const cp = classpath.join(delimiter)
    const { stderr: javacErr } = await execFileAsync(javac, [
      '--release', '17', '-cp', cp, '-d', classDir, srcFile
    ])
    if (javacErr) onLog(`[mod] javac: ${javacErr.trim()}`)

    const { stderr: jarErr } = await execFileAsync(jarCmd, [
      'cfm', modJar, manifest, '-C', classDir, '.'
    ])
    if (jarErr) onLog(`[mod] jar: ${jarErr.trim()}`)

    await writeFile(verFile, MOD_VERSION)
    onLog('[mod] shinsei-menu.jar compilé avec succès.')
  } catch (err: any) {
    onLog(`⚠️ [mod] Build échoué : ${err.stderr?.trim() || err.message || err}`)
  } finally {
    try {
      await execAsync(process.platform === 'win32'
        ? `rmdir /s /q "${tmpDir}"` : `rm -rf "${tmpDir}"`)
    } catch { /* ignore */ }
  }
}

async function deployMenuAssets(onLog: (line: string) => void): Promise<void> {
  const modsDir = join(MC_DIR, 'mods')
  await ensureDir(modsDir)

  const builtJar = join(MC_DIR, 'shinsei-menu.jar')
  if (await fileExists(builtJar)) {
    await copyFile(builtJar, join(modsDir, 'shinsei-menu.jar'))
    onLog(`[mod] Déployé → ${join(modsDir, 'shinsei-menu.jar')}`)
  } else {
    onLog('[mod] Pas de JAR à déployer (build échoué ?).')
  }

  const srcIngame = join(app.getAppPath(), 'src', 'img', 'loading', 'ingame.png')
  if (await fileExists(srcIngame)) {
    await copyFile(srcIngame, join(MC_DIR, 'shinsei-ingame.png'))
  }
}

// ── Vérification Forge ────────────────────────────────────────────────────────

export async function isForgeReady(): Promise<boolean> {
  const ver = await getForgeLatestVersion()
  return isForgeInstalled(ver)
}

// ── Masquer la fenêtre du jeu jusqu'à la fin de l'écran personnalisé ─────────

async function manageGameWindow(pid: number, flagPath: string): Promise<void> {
  if (process.platform !== 'win32') return

  const typeDef = `try { Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
public class WH { [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c); }
"@ } catch {}`

  const makeCmd = (show: number, failOnNoWindow: boolean) => {
    const s = `${typeDef}
$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue
if ($p -and $p.MainWindowHandle -ne [IntPtr]::Zero) {
  try { [WH]::ShowWindow($p.MainWindowHandle, ${show}) | Out-Null } catch { exit 1 }
}${failOnNoWindow ? ' else { exit 1 }' : ''}`
    return `powershell -NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand ${
      Buffer.from(s, 'utf16le').toString('base64')}`
  }

  // Phase 1 — cacher la fenêtre dès qu'elle apparaît (max 15 s)
  const hideCmd = makeCmd(0, true)
  let hidden = false
  for (let i = 0; i < 30 && !hidden; i++) {
    await new Promise<void>(r => setTimeout(r, 500))
    try { await execAsync(hideCmd); hidden = true } catch { /* fenêtre pas encore prête */ }
  }
  if (!hidden) return

  // Phase 2 — attendre le signal du Java agent (flag file), puis révéler en maximisé
  const showCmd = makeCmd(3, false) // 3 = SW_SHOWMAXIMIZED
  for (let i = 0; i < 360; i++) {
    await new Promise<void>(r => setTimeout(r, 1000))
    if (await fileExists(flagPath)) {
      await unlink(flagPath).catch(() => {})
      try { await execAsync(showCmd) } catch { /* ignore */ }
      return
    }
  }
}

// ── Lancement ─────────────────────────────────────────────────────────────────

export async function launchMinecraft(opts: LaunchOptions): Promise<void> {
  const { onProgress, onLog } = opts

  await ensureDir(MC_DIR)
  await ensureDir(VERSIONS_DIR)
  await ensureDir(LIBS_DIR)
  await ensureDir(ASSETS_DIR)

  // ── Résolution du chemin Java (tôt, nécessaire pour l'installer) ──
  let java = opts.javaPath?.trim() || (process.platform === 'win32' ? 'javaw' : 'java')

  if (process.platform === 'win32' && /java\.exe$/i.test(java)) {
    const javaw = java.replace(/java\.exe$/i, 'javaw.exe')
    if (await fileExists(javaw)) java = javaw
  }

  const isAbsolute = java.includes('\\') || java.includes('/')
  if (isAbsolute && !await fileExists(java)) {
    onLog(`⚠️  Java non trouvé à "${java}", bascule sur javaw du PATH…`)
    java = process.platform === 'win32' ? 'javaw' : 'java'
  }

  // ── Métadonnées Mojang ──
  onProgress('Récupération des métadonnées Mojang…', 2)
  const vanillaMeta = await fetchVanillaMeta()

  // ── Client JAR vanilla ──
  const clientJar = join(VERSIONS_DIR, MC_VERSION, `${MC_VERSION}.jar`)
  await ensureDir(join(VERSIONS_DIR, MC_VERSION))
  let needsClientDl = !await fileExists(clientJar)
  if (!needsClientDl) {
    try {
      const { size } = await stat(clientJar)
      if (size !== vanillaMeta.downloads.client.size) {
        onLog(`⚠️ client jar invalide (taille ${size} ≠ ${vanillaMeta.downloads.client.size}), re-téléchargement…`)
        needsClientDl = true
      }
    } catch { needsClientDl = true }
  }
  if (needsClientDl) {
    onProgress('Téléchargement du client 1.21.1…', 5)
    await downloadFile(
      vanillaMeta.downloads.client.url,
      clientJar,
      (r) => onProgress('Client Minecraft 1.21.1', 5 + r * 6)
    )
  }

  // ── Librairies vanilla ──
  onProgress('Vérification des librairies vanilla…', 12)
  const nativesDir = join(VERSIONS_DIR, MC_VERSION, 'natives')
  await ensureDir(nativesDir)
  const vanillaClasspath = await downloadVanillaLibraries(vanillaMeta.libraries, onProgress)

  // ── Assets ──
  onProgress('Vérification des assets…', 43)
  await downloadAssets(vanillaMeta, onProgress)

  // ── Forge ──
  onProgress('Vérification de Forge…', 54)
  const forgeVer = await getForgeLatestVersion()

  if (!await isForgeInstalled(forgeVer)) {
    // Si le JSON existe mais les libs locales manquent → installation précédente incomplète
    const forgeJson = join(VERSIONS_DIR, forgeId(forgeVer), `${forgeId(forgeVer)}.json`)
    if (await fileExists(forgeJson)) {
      onLog('⚠️ Installation Forge incomplète détectée (fichiers manquants) — réinstallation…')
      await unlink(forgeJson).catch(() => {})
    }
    await runForgeInstaller(java, forgeVer, onProgress, onLog)
  }

  onProgress('Chargement du profil Forge…', 93)
  const forgeProfile = await loadForgeProfile(forgeVer)
  const fId = forgeId(forgeVer)

  // ── Librairies Forge manquantes (l'installer en télécharge la plupart) ──
  onProgress('Vérification des librairies Forge…', 94)
  const forgeClasspath = await downloadForgeLibraries(forgeProfile.libraries ?? [], onProgress)

  // ── Construction du classpath ──
  // Pour Forge 1.21.1 : vanillaLibs + forgeLibs + clientJar
  // Les JARs Forge spécifiques (bootstraplauncher, securejarhandler) sont dans forgeClasspath
  const classpath = [
    ...forgeClasspath,
    ...vanillaClasspath,
    clientJar,
  ]

  // ── Résolution des variables ${placeholder} ──
  const cpString = classpath.join(delimiter)
  const vars: Record<string, string> = {
    auth_player_name:    opts.username,
    version_name:        fId,
    game_directory:      GAME_DIR,
    assets_root:         ASSETS_DIR,
    assets_index_name:   vanillaMeta.assetIndex.id,
    auth_uuid:           opts.uuid,
    auth_access_token:   opts.accessToken,
    auth_xuid:           '',
    clientid:            '',
    user_type:           'msa',
    version_type:        'release',
    natives_directory:   nativesDir,
    launcher_name:       'shinsei-launcher',
    launcher_version:    '1.0.0',
    classpath:           cpString,
    game_assets:         ASSETS_DIR,
    library_directory:   LIBS_DIR,
    classpath_separator: delimiter,
  }
  const resolve = (s: string) => s.replace(/\$\{(\w+)\}/g, (_, k) => vars[k] ?? '')

  function parseArgs(args: any[]): string[] {
    const result: string[] = []
    for (const arg of args) {
      if (typeof arg === 'string') {
        result.push(resolve(arg))
      } else if (arg.rules && isOSAllowed({ rules: arg.rules })) {
        const vals = Array.isArray(arg.value) ? arg.value : [arg.value]
        result.push(...vals.map(resolve))
      } else if (!arg.rules && arg.value) {
        const vals = Array.isArray(arg.value) ? arg.value : [arg.value]
        result.push(...vals.map(resolve))
      }
    }
    return result
  }

  // ── Mod menu personnalisé ──
  onProgress('Préparation du menu personnalisé…', 95)
  await buildMenuMod(java, classpath, onLog)
  await deployMenuAssets(onLog)

  // ── Agent Shinsei Boot Screen ──
  await buildBootAgent(java)
  const agentJar    = join(MC_DIR, 'shinsei-boot.jar')
  const loadingPng  = join(MC_DIR, 'shinsei-loading.png').replace(/\\/g, '/')
  const agentArgStr = `${loadingPng}|${opts.resolution ?? '1280x720'}|${opts.username}|${MC_VERSION}`
  const agentArgs   = await fileExists(agentJar) ? [`-javaagent:${agentJar}=${agentArgStr}`] : []

  // ── Arguments JVM ──
  // Fusionner les args vanilla + Forge (Forge hérite de vanilla via "inheritsFrom")
  const jvmArgs: string[] = [
    ...agentArgs,
    `-Xmx${opts.ramGb}G`,
    `-Xms1G`,
    ...parseArgs(vanillaMeta.arguments?.jvm ?? []),
    ...parseArgs(forgeProfile.arguments?.jvm ?? []),
    forgeProfile.mainClass ?? vanillaMeta.mainClass,
  ]

  // ── Arguments du jeu ──
  const { width: screenW, height: screenH } = electronScreen.getPrimaryDisplay().bounds
  const gameArgs: string[] = [
    '--width',  String(screenW),
    '--height', String(screenH),
    ...parseArgs(vanillaMeta.arguments?.game ?? []),
    ...parseArgs(forgeProfile.arguments?.game ?? []),
  ]

  // ── Log fichier ──
  const logPath = join(MC_DIR, 'game_launch.log')
  const logStream = createWriteStream(logPath, { flags: 'w' })
  const logAll = (line: string) => { logStream.write(line + '\n'); onLog(line) }

  logAll(`=== SHINSEI LAUNCHER ${new Date().toISOString()} ===`)
  logAll(`Java     : ${java}`)
  logAll(`Version  : Minecraft ${MC_VERSION} + Forge ${forgeVer}`)
  logAll(`Dir      : ${GAME_DIR}`)
  logAll(`CP count : ${classpath.length}`)
  logAll(`Main     : ${forgeProfile.mainClass ?? vanillaMeta.mainClass}`)
  logAll(`JVM args (${jvmArgs.length}):`)
  jvmArgs.forEach((a, i) => logAll(`  [${i}] ${a}`))
  logAll(`Game args (${gameArgs.length}):`)
  gameArgs.forEach((a, i) => logAll(`  [${i}] ${a}`))
  logAll('=== OUTPUT ===')

  onProgress("Déploiement de l'écran de chargement…", 97)
  await deployLoadingScreenConfig()

  onProgress('Lancement de Minecraft…', 98)

  const flagPath = join(MC_DIR, 'shinsei-ready.flag')
  await unlink(flagPath).catch(() => {}) // nettoyer un éventuel flag de la session précédente

  const proc = spawn(java, [...jvmArgs, ...gameArgs], {
    detached:    true,
    stdio:       'pipe',
    cwd:         GAME_DIR,
    windowsHide: true,
  })

  if (proc.pid !== undefined) void manageGameWindow(proc.pid, flagPath)

  const stderrBuf: string[] = []
  proc.stdout?.on('data', (d: Buffer) => { const l = d.toString().trim(); if (l) logAll(l) })
  proc.stderr?.on('data', (d: Buffer) => { const l = d.toString().trim(); if (l) { stderrBuf.push(l); logAll(l) } })

  // Phase 1 — détecter un crash dans les 10 premières secondes
  await new Promise<void>((resolve, reject) => {
    let settled = false
    const settle = (fn: () => void) => { if (!settled) { settled = true; fn() } }

    const timer = setTimeout(() => settle(resolve), 10000)

    proc.on('error', (err) => {
      settle(() => {
        clearTimeout(timer)
        logStream.end()
        reject(new Error(
          err.message.includes('ENOENT')
            ? `Java introuvable : "${java}" — Installe Java 21 ou corrige le chemin dans Paramètres`
            : `Erreur lancement Java : ${err.message}`
        ))
      })
    })

    proc.on('close', (code) => {
      logAll(`Minecraft fermé (code ${code})`)
      settle(() => {
        clearTimeout(timer)
        logStream.end()
        if (code !== 0 && code !== null) {
          const errors = stderrBuf.filter(l => /Error|Exception/i.test(l)).slice(-3).join(' | ')
          reject(new Error(`Minecraft a planté (code ${code})${errors ? ` — ${errors}` : ''} — voir ${logPath}`))
        } else {
          // Sortie propre dans les 10 premières secondes
          opts.onExit?.()
          resolve()
        }
      })
    })
  })

  // Phase 2 — surveiller les crashs tardifs en arrière-plan
  proc.unref()
  onProgress('Minecraft lancé !', 100)
  onLog(`📋 Logs launcher : ${logPath}`)

  const mcLogPath = join(GAME_DIR, 'logs', 'latest.log')

  proc.once('close', (code) => {
    logStream.end()
    if (code !== null && code !== 0) {
      ;(async () => {
        let detail = ''
        try {
          const mcLog = await readFile(mcLogPath, 'utf-8')
          const errorLines = mcLog.split('\n')
            .filter(l => /\[FATAL\]|\[ERROR\]|Exception|Error:/i.test(l))
            .slice(-8)
          if (errorLines.length) detail = errorLines.join('\n')
        } catch {}

        if (!detail) {
          detail = stderrBuf.filter(l => /Error|Exception/i.test(l)).slice(-5).join('\n')
        }

        opts.onCrash?.([
          `Minecraft a planté (code ${code})`,
          detail || '(aucun détail — voir les logs)',
          `📋 ${mcLogPath}`,
        ].join('\n'))
      })()
    } else {
      // Sortie propre après les 10 premières secondes
      opts.onExit?.()
    }
  })
}
