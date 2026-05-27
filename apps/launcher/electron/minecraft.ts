import { spawn, exec }            from 'child_process'
import { join, delimiter }         from 'path'
import { mkdir, readFile, access, writeFile, copyFile } from 'fs/promises'
import { createWriteStream }       from 'fs'
import { promisify }               from 'util'
import * as https                  from 'https'
import * as http                   from 'http'
import * as os                     from 'os'
import { app }                     from 'electron'

const execAsync = promisify(exec)

// ── Configuration ─────────────────────────────────────────────────────────────
const MC_VERSION = '1.21.1'
// ──────────────────────────────────────────────────────────────────────────────

export interface LaunchOptions {
  username:    string
  uuid:        string
  accessToken: string
  javaPath:    string
  ramGb:       number
  onProgress:  (label: string, percent: number) => void
  onLog:       (line: string) => void
  onCrash?:    (error: string) => void
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

async function fileExists(p: string): Promise<boolean> {
  try { await access(p); return true } catch { return false }
}

function downloadFile(
  url:         string,
  dest:        string,
  onProgress?: (ratio: number) => void,
  timeoutMs  = 30_000
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
// ex: "net.fabricmc:fabric-loader:0.16.5" → "net/fabricmc/fabric-loader/0.16.5/fabric-loader-0.16.5.jar"
function mavenToPath(name: string): string {
  const parts   = name.split(':')
  const group   = parts[0].replace(/\./g, '/')
  const artifact = parts[1]
  const version  = parts[2]
  const classifier = parts[3] ? `-${parts[3]}` : ''
  return `${group}/${artifact}/${version}/${artifact}-${version}${classifier}.jar`
}

// Extrait les .dll/.so/.dylib d'un JAR dans destDir (natives) — async pour ne pas bloquer
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
  } catch {
    // Ignorer — certains JARs ne contiennent pas de natives
  }
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

// ── Métadonnées Fabric ────────────────────────────────────────────────────────

async function fetchFabricLoaderVersion(): Promise<string> {
  const loaders = await fetch(
    `https://meta.fabricmc.net/v2/versions/loader/${MC_VERSION}`
  ).then(r => r.json()) as any[]

  const stable = loaders.find(l => l.loader.stable === true) ?? loaders[0]
  if (!stable) throw new Error('Aucun loader Fabric stable trouvé pour ' + MC_VERSION)
  return stable.loader.version as string
}

async function fetchFabricProfile(loaderVersion: string): Promise<any> {
  const fabricId   = `fabric-loader-${loaderVersion}-${MC_VERSION}`
  const cachedPath = join(VERSIONS_DIR, fabricId, `${fabricId}.json`)
  if (await fileExists(cachedPath)) {
    return JSON.parse(await readFile(cachedPath, 'utf-8'))
  }
  const profile = await fetch(
    `https://meta.fabricmc.net/v2/versions/loader/${MC_VERSION}/${loaderVersion}/profile/json`
  ).then(r => r.json())

  await ensureDir(join(VERSIONS_DIR, fabricId))
  await writeFile(cachedPath, JSON.stringify(profile, null, 2))
  return profile
}

// ── Téléchargement des librairies ─────────────────────────────────────────────

function isOSAllowed(lib: any): boolean {
  if (!lib.rules) return true
  const os = process.platform === 'win32' ? 'windows'
           : process.platform === 'darwin' ? 'osx' : 'linux'
  let allowed = false
  for (const rule of lib.rules) {
    if (rule.features) continue  // args conditionnels aux features du launcher — ignorer
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

    // Tout va dans le classpath — les JARs natifs LWJGL 3 s'auto-extraient
    // via -Dorg.lwjgl.system.SharedLibraryExtractPath (déjà dans le manifest)
    classpath.push(libPath)

    // Ancien format classifiers (LWJGL 2 / très anciennes versions)
    const osName  = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux'
    const natKey  = lib.natives?.[osName]?.replace('${arch}', process.arch === 'x64' ? '64' : '32')
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

async function downloadFabricLibraries(
  libs:      any[],
  onProgress: (label: string, pct: number) => void
): Promise<string[]> {
  const classpath: string[] = []

  for (let i = 0; i < libs.length; i++) {
    const lib  = libs[i]
    const name = lib.name as string
    const rel  = lib.url
      ? mavenToPath(name)
      : mavenToPath(name)

    const libPath = join(LIBS_DIR, rel)
    await ensureDir(join(libPath, '..'))

    if (!await fileExists(libPath)) {
      const baseUrl = (lib.url ?? 'https://repo1.maven.org/maven2/').replace(/\/$/, '')
      const url     = `${baseUrl}/${rel}`
      onProgress(`Fabric: ${name.split(':')[1]}`, 55 + (i / libs.length) * 10)
      await downloadFile(url, libPath)
    }
    classpath.push(libPath)
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
  const BATCH = 10  // téléchargements parallèles

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
    onProgress(
      `Assets ${done}/${entries.length}`,
      44 + (done / entries.length) * 10
    )
  }
}

// ── Vérification installation Fabric ─────────────────────────────────────────

export async function isFabricInstalled(): Promise<boolean> {
  try {
    const loaderVersion = await fetchFabricLoaderVersion()
    const fabricId      = `fabric-loader-${loaderVersion}-${MC_VERSION}`
    const profilePath   = join(VERSIONS_DIR, fabricId, `${fabricId}.json`)
    const clientJar     = join(VERSIONS_DIR, MC_VERSION, `${MC_VERSION}.jar`)
    return (await fileExists(profilePath)) && (await fileExists(clientJar))
  } catch {
    return false
  }
}

// ── Déploiement de l'écran de chargement custom ───────────────────────────────

async function deployLoadingScreenConfig(): Promise<void> {
  const configDir      = join(MC_DIR, 'config')
  const fancyAssetsDir = join(configDir, 'fancymenu', 'assets')
  const fancyCustomDir = join(configDir, 'fancymenu', 'customization')
  const drippyDir      = join(configDir, 'drippyloadingscreen')

  await ensureDir(fancyAssetsDir)
  await ensureDir(fancyCustomDir)
  await ensureDir(drippyDir)

  // Copier loading.png depuis les ressources du launcher
  const srcPng  = join(app.getAppPath(), 'src', 'img', 'loading', 'loading.png')
  const destPng = join(fancyAssetsDir, 'loading.png')
  if (await fileExists(srcPng)) {
    await copyFile(srcPng, destPng)
  }

  // Chemins absolus normalisés pour drippyloadingscreen
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

  await writeFile(join(fancyCustomDir, 'shinsei_loading.txt'),
`type=fancymenu_layout

meta{
screen=de.keksuccino.drippyloadingscreen.customization.DrippyOverlayScreen
name=shinsei_loading
is_enabled=enabled
last_edited_time=0
}

menu_background{
background_type=fancymenu.backgrounds.image
image_path=fancymenu/assets/loading.png
}

element{
element_type=drippy_vanilla_bar
identifier=loading_bar
anchor=bot_left
posx=0
posy=-22
width=3840
height=5
color=#ff00ffff
layer=1
}

element{
element_type=text_v2
identifier=loading_label
anchor=bot_center
posx=-100
posy=-32
width=200
height=14
text=CHARGEMENT...
color=#ffffffff
shadow=false
layer=2
}`)
}

// ── Lancement ─────────────────────────────────────────────────────────────────

export async function launchMinecraft(opts: LaunchOptions): Promise<void> {
  const { onProgress, onLog } = opts

  // Préparer les dossiers
  await ensureDir(MC_DIR)
  await ensureDir(VERSIONS_DIR)
  await ensureDir(LIBS_DIR)
  await ensureDir(ASSETS_DIR)

  onProgress('Récupération des métadonnées Mojang…', 2)
  const vanillaMeta = await fetchVanillaMeta()

  // ── Client JAR vanilla ──
  const clientJar = join(VERSIONS_DIR, MC_VERSION, `${MC_VERSION}.jar`)
  await ensureDir(join(VERSIONS_DIR, MC_VERSION))
  if (!await fileExists(clientJar)) {
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

  // ── Fabric ──
  onProgress('Récupération du Fabric Loader…', 54)
  const loaderVersion  = await fetchFabricLoaderVersion()
  const fabricProfile  = await fetchFabricProfile(loaderVersion)
  const fabricVersionId = fabricProfile.id as string

  onProgress('Téléchargement des librairies Fabric…', 55)
  const fabricClasspath = await downloadFabricLibraries(
    fabricProfile.libraries ?? [], onProgress
  )

  // ── Construction du classpath ──
  // Fabric en tête, puis vanilla, puis client JAR en dernier
  const classpath = [
    ...fabricClasspath,
    ...vanillaClasspath,
    clientJar,
  ]

  // ── Résolution des variables ${placeholder} ──
  const cpString = classpath.join(delimiter)
  const vars: Record<string, string> = {
    auth_player_name:  opts.username,
    version_name:      fabricVersionId,
    game_directory:    GAME_DIR,
    assets_root:       ASSETS_DIR,
    assets_index_name: vanillaMeta.assetIndex.id,
    auth_uuid:         opts.uuid,
    auth_access_token: opts.accessToken,
    auth_xuid:         '',
    clientid:          '',
    user_type:         'msa',
    version_type:      'release',
    natives_directory: nativesDir,
    launcher_name:     'shinsei-launcher',
    launcher_version:  '1.0.0',
    classpath:         cpString,
    game_assets:       ASSETS_DIR,
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
      }
    }
    return result
  }

  // ── Agent Shinsei Boot Screen (optionnel) ──
  const agentJar  = join(MC_DIR, 'shinsei-boot.jar')
  const agentArgs = await fileExists(agentJar) ? [`-javaagent:${agentJar}`] : []

  // ── Arguments JVM ──
  const jvmArgs: string[] = [
    ...agentArgs,
    `-Xmx${opts.ramGb}G`,
    `-Xms1G`,
    `-Dfabric.gameJarPath=${clientJar}`,
    ...parseArgs(vanillaMeta.arguments?.jvm ?? []),
    ...parseArgs(fabricProfile.arguments?.jvm ?? []),
    fabricProfile.mainClass ?? vanillaMeta.mainClass,
  ]

  // ── Arguments du jeu ──
  const gameArgs: string[] = [
    ...parseArgs(vanillaMeta.arguments?.game ?? []),
    ...parseArgs(fabricProfile.arguments?.game ?? []),
  ]

  // ── Résolution du chemin Java ──
  let java = opts.javaPath?.trim() || (process.platform === 'win32' ? 'javaw' : 'java')

  // Sur Windows, préférer javaw.exe (pas de fenêtre CMD) si le chemin pointe sur java.exe
  if (process.platform === 'win32' && /java\.exe$/i.test(java)) {
    const javaw = java.replace(/java\.exe$/i, 'javaw.exe')
    if (await fileExists(javaw)) java = javaw
  }

  // Vérifier que l'exécutable existe (chemins absolus seulement)
  const isAbsolute = java.includes('\\') || java.includes('/')
  if (isAbsolute && !await fileExists(java)) {
    onLog(`⚠️  Java non trouvé à "${java}", bascule sur javaw du PATH…`)
    java = process.platform === 'win32' ? 'javaw' : 'java'
  }

  // ── Log fichier ──
  const logPath = join(MC_DIR, 'game_launch.log')
  const logStream = createWriteStream(logPath, { flags: 'w' })
  const logAll = (line: string) => { logStream.write(line + '\n'); onLog(line) }

  logAll(`=== SHINSEI LAUNCHER ${new Date().toISOString()} ===`)
  logAll(`Java     : ${java}`)
  logAll(`Version  : Minecraft ${MC_VERSION} + Fabric ${loaderVersion}`)
  logAll(`Dir      : ${GAME_DIR}`)
  logAll(`CP count : ${classpath.length}`)
  logAll(`Main     : ${fabricProfile.mainClass ?? vanillaMeta.mainClass}`)
  logAll(`JVM args (${jvmArgs.length}):`)
  jvmArgs.forEach((a, i) => logAll(`  [${i}] ${a}`))
  logAll(`Game args (${gameArgs.length}):`)
  gameArgs.forEach((a, i) => logAll(`  [${i}] ${a}`))
  logAll('=== OUTPUT ===')

  onProgress('Déploiement de l\'écran de chargement…', 97)
  await deployLoadingScreenConfig()

  onProgress('Lancement de Minecraft…', 98)

  const proc = spawn(java, [...jvmArgs, ...gameArgs], {
    detached:    true,
    stdio:       'pipe',
    cwd:         GAME_DIR,
    windowsHide: true,   // pas de fenêtre CMD sur Windows
  })

  const stderrBuf: string[] = []
  proc.stdout?.on('data', (d: Buffer) => { const l = d.toString().trim(); if (l) logAll(l) })
  proc.stderr?.on('data', (d: Buffer) => { const l = d.toString().trim(); if (l) { stderrBuf.push(l); logAll(l) } })

  // Phase 1 — détecter un crash dans les 8 premières secondes
  await new Promise<void>((resolve, reject) => {
    let settled = false
    const settle = (fn: () => void) => { if (!settled) { settled = true; fn() } }

    const timer = setTimeout(() => settle(resolve), 8000)

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
          resolve()
        }
      })
    })
  })

  // Phase 2 — jeu en cours, surveiller les crashs tardifs en arrière-plan
  proc.unref()
  onProgress('Minecraft lancé !', 100)
  onLog(`📋 Logs launcher : ${logPath}`)

  const mcLogPath = join(GAME_DIR, 'logs', 'latest.log')

  proc.once('close', (code) => {
    logStream.end()
    if (code !== null && code !== 0) {
      ;(async () => {
        // Lire les logs Minecraft pour avoir la vraie erreur
        let detail = ''
        try {
          const mcLog = await readFile(mcLogPath, 'utf-8')
          const errorLines = mcLog.split('\n')
            .filter(l => /\[FATAL\]|\[ERROR\]|Exception|Error:/i.test(l))
            .slice(-8)
          if (errorLines.length) detail = errorLines.join('\n')
        } catch {}

        // Fallback sur stderr
        if (!detail) {
          detail = stderrBuf.filter(l => /Error|Exception/i.test(l)).slice(-5).join('\n')
        }

        opts.onCrash?.([
          `Minecraft a planté (code ${code})`,
          detail || '(aucun détail — voir les logs)',
          `📋 ${mcLogPath}`,
        ].join('\n'))
      })()
    }
  })
}
