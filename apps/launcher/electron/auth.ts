import { BrowserWindow } from 'electron'

const MS_CLIENT_ID = '00000000402b5328'
const MS_REDIRECT  = 'https://login.live.com/oauth20_desktop.srf'
const MS_SCOPE     = 'service::user.auth.xboxlive.com::MBI_SSL'

function formatUUID(id: string): string {
  return `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`
}

function getAuthCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    let done = false

    const authUrl =
      `https://login.live.com/oauth20_authorize.srf` +
      `?client_id=${MS_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(MS_REDIRECT)}` +
      `&scope=${encodeURIComponent(MS_SCOPE)}` +
      `&response_type=code` +
      `&prompt=login`

    const win = new BrowserWindow({
      width: 480,
      height: 660,
      resizable: false,
      title: 'Connexion Microsoft',
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })
    win.setMenuBarVisibility(false)

    const tryResolve = (url: string) => {
      if (done) return
      if (!url.startsWith(MS_REDIRECT)) return
      done = true

      let code: string | null = null
      let error: string | null = null
      try {
        const parsed = new URL(url)
        code  = parsed.searchParams.get('code')
        error = parsed.searchParams.get('error_description') ?? parsed.searchParams.get('error')
      } catch {}

      setImmediate(() => { try { win.destroy() } catch {} })

      if (code) resolve(code)
      else reject(new Error(error ?? 'Code manquant dans la redirection'))
    }

    win.webContents.on('will-redirect',           (_, url) => tryResolve(url))
    win.webContents.on('will-navigate',           (_, url) => tryResolve(url))
    win.webContents.on('did-navigate',            (_, url) => tryResolve(url))
    win.webContents.on('did-redirect-navigation', (_, url) => tryResolve(url))

    win.on('closed', () => {
      if (!done) {
        done = true
        reject(new Error('Fenêtre fermée'))
      }
    })

    win.loadURL(authUrl)
  })
}

async function getMSToken(code: string): Promise<{ accessToken: string; refreshToken: string }> {
  const body = new URLSearchParams({
    client_id:    MS_CLIENT_ID,
    code,
    grant_type:   'authorization_code',
    redirect_uri: MS_REDIRECT,
    scope:        MS_SCOPE,
  })
  const res  = await fetch('https://login.live.com/oauth20_token.srf', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  })
  const data = await res.json() as any
  if (!data.access_token) throw new Error(`Token Microsoft invalide: ${JSON.stringify(data)}`)
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? '' }
}

async function refreshMSToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const body = new URLSearchParams({
    client_id:     MS_CLIENT_ID,
    refresh_token: refreshToken,
    grant_type:    'refresh_token',
    redirect_uri:  MS_REDIRECT,
    scope:         MS_SCOPE,
  })
  const res  = await fetch('https://login.live.com/oauth20_token.srf', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  })
  const data = await res.json() as any
  if (!data.access_token) throw new Error(`Refresh token invalide`)
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? refreshToken }
}

async function getXBLToken(msToken: string): Promise<{ token: string; uhs: string }> {
  const res  = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body:    JSON.stringify({
      Properties:   { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `t=${msToken}` },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType:    'JWT',
    }),
  })
  const data = await res.json() as any
  if (!data.Token) throw new Error(`Erreur XBL: ${JSON.stringify(data)}`)
  return { token: data.Token, uhs: data.DisplayClaims.xui[0].uhs }
}

async function getXSTSToken(xblToken: string): Promise<{ token: string; uhs: string }> {
  const res  = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body:    JSON.stringify({
      Properties:   { SandboxId: 'RETAIL', UserTokens: [xblToken] },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType:    'JWT',
    }),
  })
  const data = await res.json() as any
  if (data.XErr === 2148916233) throw new Error('Compte Microsoft sans Xbox — crée un profil Xbox d\'abord')
  if (data.XErr === 2148916238) throw new Error('Compte enfant — connexion non autorisée')
  if (!data.Token)              throw new Error(`Erreur XSTS: ${JSON.stringify(data)}`)
  return { token: data.Token, uhs: data.DisplayClaims.xui[0].uhs }
}

async function getMCToken(xstsToken: string, uhs: string): Promise<string> {
  const res  = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ identityToken: `XBL3.0 x=${uhs};${xstsToken}` }),
  })
  const data = await res.json() as any
  if (!data.access_token) throw new Error(`Token Minecraft invalide: ${JSON.stringify(data)}`)
  return data.access_token
}

async function getMCProfile(mcToken: string): Promise<{ uuid: string; username: string }> {
  const res  = await fetch('https://api.minecraftservices.com/minecraft/profile', {
    headers: { Authorization: `Bearer ${mcToken}` },
  })
  const data = await res.json() as any
  if (!data.id) throw new Error('Profil Minecraft introuvable — le compte possède-t-il une licence Java ?')
  return { uuid: formatUUID(data.id), username: data.name }
}

async function authChain(msAccessToken: string): Promise<{ uuid: string; username: string; accessToken: string }> {
  const { token: xblToken }       = await getXBLToken(msAccessToken)
  const { token: xstsToken, uhs } = await getXSTSToken(xblToken)
  const mcToken                   = await getMCToken(xstsToken, uhs)
  const profile                   = await getMCProfile(mcToken)
  return { ...profile, accessToken: mcToken }
}

export async function microsoftLogin(): Promise<{ uuid: string; username: string; accessToken: string; refreshToken: string }> {
  const code                                      = await getAuthCode()
  const { accessToken: msToken, refreshToken }    = await getMSToken(code)
  const profile                                   = await authChain(msToken)
  return { ...profile, refreshToken }
}

export async function silentLogin(refreshToken: string): Promise<{ uuid: string; username: string; accessToken: string; refreshToken: string }> {
  const { accessToken: msToken, refreshToken: newRefreshToken } = await refreshMSToken(refreshToken)
  const profile = await authChain(msToken)
  return { ...profile, refreshToken: newRefreshToken }
}
