package fr.shinsei.menu;

import com.mojang.blaze3d.platform.NativeImage;
import com.mojang.blaze3d.systems.RenderSystem;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.AbstractButton;
import net.minecraft.client.gui.narration.NarrationElementOutput;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.TitleScreen;
import net.minecraft.client.renderer.texture.DynamicTexture;
import net.minecraft.client.resources.sounds.SimpleSoundInstance;
import net.minecraft.client.resources.sounds.SoundInstance;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.RandomSource;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.ScreenEvent;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.EventPriority;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.loading.FMLPaths;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.awt.Desktop;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Random;

@Mod("shinsei")
@Mod.EventBusSubscriber(modid = "shinsei", bus = Mod.EventBusSubscriber.Bus.FORGE, value = Dist.CLIENT)
public class ShinseiMenuMod {

    static final Logger LOG       = LogManager.getLogger("SHINSEI");
    static final String SERVER_IP = "localhost:25565";
    static final String SHOP_URL  = "https://shinsei.fr/boutique";

    public ShinseiMenuMod() {
        LOG.info("[SHINSEI] Mod v31 chargé");
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onOpening(ScreenEvent.Opening e) {
        Screen ns = e.getNewScreen();
        if (ns instanceof TitleScreen && !(ns instanceof ShinseiTitleScreen)) {
            e.setNewScreen(new ShinseiTitleScreen());
        }
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onInitPost(ScreenEvent.Init.Post e) {
        if (e.getScreen() instanceof TitleScreen && !(e.getScreen() instanceof ShinseiTitleScreen)) {
            Minecraft.getInstance().setScreen(new ShinseiTitleScreen());
        }
    }

    @SubscribeEvent
    public static void onClientTick(TickEvent.ClientTickEvent e) {
        if (e.phase != TickEvent.Phase.END) return;
        Minecraft mc = Minecraft.getInstance();

        boolean inShinsei = mc.screen instanceof ShinseiTitleScreen
                         || mc.screen instanceof ShinseiOptionsScreen
                         || (mc.screen != null && isShinseiSubScreen(mc.screen.getClass().getName()));

        if (inShinsei) {
            ShinseiTitleScreen.manageMusicTick(mc);
        } else if (ShinseiTitleScreen.currentMusic != null
                   && mc.getSoundManager().isActive(ShinseiTitleScreen.currentMusic)) {
            mc.getSoundManager().stop(ShinseiTitleScreen.currentMusic);
            ShinseiTitleScreen.currentMusic = null;
        }
    }

    @SubscribeEvent
    public static void onSubScreenRenderPre(ScreenEvent.Render.Pre e) {
        Screen s = e.getScreen();
        if (s instanceof ShinseiTitleScreen || s instanceof ShinseiOptionsScreen) return;
        if (!isShinseiSubScreen(s.getClass().getName())) return;

        e.setCanceled(true);
        GuiGraphics g  = e.getGuiGraphics();
        Minecraft   mc = Minecraft.getInstance();
        int   W  = s.width, H = s.height;
        int   mx = e.getMouseX(), my = e.getMouseY();
        float pt = e.getPartialTick();
        double sec = System.currentTimeMillis() / 1000.0;

        // 1. Base fill
        g.fill(0, 0, W, H, 0xFF04040D);

        // 2. Background image
        if (ShinseiTitleScreen.bgTex != null && ShinseiTitleScreen.bgNatW > 0) {
            float sc = Math.max((float)W / ShinseiTitleScreen.bgNatW,
                                (float)H / ShinseiTitleScreen.bgNatH);
            int dW = Math.round(ShinseiTitleScreen.bgNatW * sc);
            int dH = Math.round(ShinseiTitleScreen.bgNatH * sc);
            int ox = (W - dW) / 2, oy = (H - dH) / 2;
            RenderSystem.setShaderColor(1f, 1f, 1f, 1f);
            g.pose().pushPose();
            g.pose().translate(ox, oy, 0f);
            g.pose().scale(sc, sc, 1f);
            g.blit(ShinseiTitleScreen.bgTex, 0, 0, 0f, 0f,
                ShinseiTitleScreen.bgNatW, ShinseiTitleScreen.bgNatH,
                ShinseiTitleScreen.bgNatW, ShinseiTitleScreen.bgNatH);
            g.pose().popPose();
        }

        // 3. Overlay sombre
        g.fill(0, 0, W, H, 0xCC040410);

        // 4. Vignettes
        int topH = H / 5;
        for (int y = 0; y < topH; y++) {
            float t = 1f - (float)y / topH;
            g.fill(0, y, W, y + 1, ((int)(60 * t * t)) << 24);
        }
        int botStart = H * 3 / 4;
        for (int y = botStart; y < H; y++) {
            float t = (float)(y - botStart) / (H - botStart);
            g.fill(0, y, W, y + 1, ((int)(150 * t * t)) << 24);
        }

        // 5. Récupérer les renderables
        java.util.List<net.minecraft.client.gui.components.Renderable> copy =
            java.util.Collections.emptyList();
        try {
            java.lang.reflect.Field rf = Screen.class.getDeclaredField("renderables");
            rf.setAccessible(true);
            @SuppressWarnings("unchecked")
            java.util.List<net.minecraft.client.gui.components.Renderable> rends =
                (java.util.List<net.minecraft.client.gui.components.Renderable>) rf.get(s);
            copy = new java.util.ArrayList<>(rends);
        } catch (Throwable ex) {
            ShinseiMenuMod.LOG.error("[SHINSEI] render: {}", ex.toString());
        }

        // 5b. Par container : sauvegarder Y, forcer sentinel -9999, masquer.
        //     Le rendu vanilla appelle setY(top) UNIQUEMENT pour les entrées visibles.
        //     Après render : Y==-9999 ⟹ entrée hors écran → ignorer en pass 8.
        java.util.List<net.minecraft.client.gui.components.Renderable> containers =
            new java.util.ArrayList<>();
        java.util.List<java.util.List<net.minecraft.client.gui.components.AbstractWidget>> containerWidgetLists =
            new java.util.ArrayList<>();
        java.util.List<java.util.List<Integer>> containerOrigY =
            new java.util.ArrayList<>();
        for (net.minecraft.client.gui.components.Renderable r : copy) {
            if (r instanceof AbstractButton) continue;
            java.util.List<net.minecraft.client.gui.components.AbstractWidget> wList =
                new java.util.ArrayList<>();
            java.util.List<Integer> origYList = new java.util.ArrayList<>();
            try {
                java.util.List<?> entries =
                    (java.util.List<?>) r.getClass().getMethod("children").invoke(r);
                for (Object entry : entries) {
                    try {
                        java.util.List<?> widgets =
                            (java.util.List<?>) entry.getClass().getMethod("children").invoke(entry);
                        for (Object w : widgets) {
                            if (w instanceof net.minecraft.client.gui.components.AbstractWidget aw) {
                                origYList.add(aw.getY());
                                aw.setY(-9999);    // sentinel écrasé par setY(top) si l'entrée est visible
                                wList.add(aw);
                                aw.visible = false;
                            }
                        }
                    } catch (Throwable ignored) {}
                }
            } catch (Throwable ignored) {}
            if (!wList.isEmpty()) {
                containers.add(r);
                containerWidgetLists.add(wList);
                containerOrigY.add(origYList);
            }
        }

        // 6. Rendu vanilla des containers (liste options, etc.) — widgets imbriqués cachés
        for (net.minecraft.client.gui.components.Renderable r : copy) {
            if (r instanceof AbstractButton) continue;
            if (r instanceof net.minecraft.client.gui.components.AbstractWidget aw
                    && aw.getY() + aw.getHeight() <= 36) continue;
            r.render(g, mx, my, pt);
        }

        // 7. Boutons directs (Terminer, etc.) en style Shinsei
        for (net.minecraft.client.gui.components.Renderable r : copy) {
            if (r instanceof AbstractButton ab) shinseiBtn(g, mc, ab, mx, my);
        }

        // 8. Widgets imbriqués en style Shinsei avec scissor + filtre sentinel
        //    Si Y==-9999 : setY n'a pas été appelé → entrée non visible → Y restauré, pas de dessin
        for (int ci = 0; ci < containers.size(); ci++) {
            net.minecraft.client.gui.components.Renderable container = containers.get(ci);
            java.util.List<net.minecraft.client.gui.components.AbstractWidget> wList =
                containerWidgetLists.get(ci);
            java.util.List<Integer> origYList = containerOrigY.get(ci);
            boolean hasScissor = false;
            if (container instanceof net.minecraft.client.gui.components.AbstractWidget cw) {
                int scx = cw.getX(), scy = cw.getY(), scw = cw.getWidth(), sch = cw.getHeight();
                if (scw > 0 && sch > 0) {
                    g.enableScissor(scx, scy, scx + scw, scy + sch);
                    hasScissor = true;
                }
            }
            for (int wi = 0; wi < wList.size(); wi++) {
                net.minecraft.client.gui.components.AbstractWidget w = wList.get(wi);
                w.visible = true;
                if (w.getY() == -9999) {
                    // Entrée hors écran : restaurer la position originale et ne pas dessiner
                    w.setY(origYList.get(wi));
                    continue;
                }
                if (w instanceof AbstractButton ab) {
                    shinseiBtn(g, mc, ab, mx, my);
                } else if (isSlider(w)) {
                    shinseiSlider(g, mc, w, mx, my);
                }
            }
            if (hasScissor) g.disableScissor();
        }

        // 9. Titre DERNIER — bande opaque pleine largeur ≥ 36 px
        String titleStr = (s.getTitle() != null ? s.getTitle().getString() : "OPTIONS").toUpperCase();
        float ts = 1.5f;
        int sw = 0;
        for (int i = 0; i < titleStr.length(); i++) {
            sw += mc.font.width(String.valueOf(titleStr.charAt(i)));
            if (i < titleStr.length() - 1) sw += 1;
        }
        int realW     = Math.round(sw * ts);
        int titX      = W / 2 - realW / 2;
        int titY      = 4;
        int titBH     = Math.round(9 * ts);
        int titleBarH = Math.max(36, titBH + 16);
        float gp      = (float)(Math.sin(sec * 1.6) * 0.5 + 0.5);
        g.fill(0, 0, W, titleBarH,     0xFF050515);
        g.fill(0, titleBarH, W, titleBarH + 1,
               ((int)(100 + 80 * gp) << 24) | 0x7c3aed);
        g.fill(titX - 8, titY - 2, titX + realW + 8, titY + titBH + 4,
               ((int)(25 + 35 * gp) << 24) | 0x5500cc);
        g.pose().pushPose();
        g.pose().scale(ts, ts, 1f);
        int cx = Math.round(titX / ts), cy = Math.round(titY / ts);
        for (int i = 0; i < titleStr.length(); i++) {
            float t   = (float)i / Math.max(1, titleStr.length() - 1);
            int   col = ShinseiTitleScreen.lerpRGB(0xFFD8CCFF, 0xFF00E5FF, t);
            String ch = String.valueOf(titleStr.charAt(i));
            g.drawString(mc.font, ch, cx, cy, col, true);
            cx += mc.font.width(ch) + 1;
        }
        g.pose().popPose();

        // 10. Bordures écran
        g.fill(0, 0, W, 2,     0xDD06b6d4);
        g.fill(0, H - 2, W, H, 0xDD7c3aed);
    }

    /** Retourne true si le widget est un AbstractSliderButton (ou sous-classe). */
    private static boolean isSlider(net.minecraft.client.gui.components.AbstractWidget w) {
        for (Class<?> c = w.getClass(); c != null; c = c.getSuperclass()) {
            if ("AbstractSliderButton".equals(c.getSimpleName())) return true;
        }
        return false;
    }

    /** Dessine un AbstractButton entièrement en style Shinsei (sans rendu vanilla). */
    private static void shinseiBtn(GuiGraphics g, Minecraft mc,
                                    AbstractButton w, int mx, int my) {
        int bx = w.getX(), by = w.getY(), bw = w.getWidth(), bh = w.getHeight();
        if (bw <= 0 || bh <= 0) return;
        boolean hov = mx >= bx && mx < bx + bw && my >= by && my < by + bh;
        int accent = hov ? 0xFF00E5FF : 0xCC7C3AED;
        g.fill(bx, by, bx + bw, by + bh, 0xFF0A0A14);
        if (hov) g.fill(bx + 1, by + 1, bx + bw - 1, by + bh - 1, 0x1500E5FF);
        g.fill(bx,          by,          bx + bw,     by + 1,      accent);
        g.fill(bx,          by + bh - 1, bx + bw,     by + bh,     accent);
        g.fill(bx,          by,          bx + 1,      by + bh,     accent);
        g.fill(bx + bw - 1, by,          bx + bw,     by + bh,     accent);
        String msg = w.getMessage().getString().toUpperCase();
        g.drawCenteredString(mc.font, msg, bx + bw / 2, by + (bh - 8) / 2,
                             hov ? 0xFF00E5FF : 0xFFC4B5FD);
    }

    /**
     * Dessine un AbstractSliderButton Shinsei.
     * Layout : texte dans les 60 % supérieurs, piste coulissante dans les 40 % inférieurs.
     * Le texte est ainsi toujours lisible, séparé visuellement du curseur.
     */
    private static void shinseiSlider(GuiGraphics g, Minecraft mc,
                                       net.minecraft.client.gui.components.AbstractWidget w,
                                       int mx, int my) {
        int bx = w.getX(), by = w.getY(), bw = w.getWidth(), bh = w.getHeight();
        if (bw <= 0 || bh <= 0) return;
        boolean hov = mx >= bx && mx < bx + bw && my >= by && my < by + bh;

        double value = 0.5;
        for (Class<?> c = w.getClass(); c != null; c = c.getSuperclass()) {
            try {
                java.lang.reflect.Field f = c.getDeclaredField("value");
                f.setAccessible(true);
                value = f.getDouble(w);
                break;
            } catch (Throwable ignored) {}
        }
        value = Math.max(0.0, Math.min(1.0, value));

        // splitY sépare zone texte (haut) et zone piste (bas)
        int splitY  = by + bh * 3 / 5;
        int pad     = 3;
        int thumbW  = 6;
        int trackW  = bw - pad * 2 - thumbW;
        int thumbX  = bx + pad + (int)(trackW * value);
        int midY    = (splitY + by + bh) / 2;  // centre vertical de la zone piste
        int fillEnd = thumbX + thumbW / 2;
        int accent  = hov ? 0xFF00E5FF : 0xCC7C3AED;

        // Fond
        g.fill(bx, by, bx + bw, by + bh, 0xFF0A0A14);
        // Légère ligne séparatrice
        g.fill(bx + 6, splitY, bx + bw - 6, splitY + 1, 0x22FFFFFF);

        // Piste : portion cyan remplie + portion vide gris
        g.fill(bx + pad, midY - 2, fillEnd,        midY + 3, 0xEE06b6d4);
        g.fill(fillEnd,  midY - 2, bx + bw - pad,  midY + 3, 0x55888888);

        // Curseur pleine hauteur zone piste
        g.fill(thumbX,     splitY + 2, thumbX + thumbW, by + bh - 2,
               hov ? 0xFFFFFFFF : 0xFF7C3AED);
        g.fill(thumbX + 1, splitY + 3, thumbX + thumbW - 1, by + bh - 3,
               hov ? 0x6600E5FF : 0x22000000);

        // Bordures
        g.fill(bx,          by,          bx + bw, by + 1,      accent);
        g.fill(bx,          by + bh - 1, bx + bw, by + bh,     accent);
        g.fill(bx,          by,          bx + 1,  by + bh,     accent);
        g.fill(bx + bw - 1, by,          bx + bw, by + bh,     accent);

        // Texte centré dans la zone supérieure, toujours lisible (shadow activée)
        String msg = "";
        try {
            msg = ((net.minecraft.network.chat.Component)
                w.getClass().getMethod("getMessage").invoke(w)).getString().toUpperCase();
        } catch (Throwable ignored) {}
        if (!msg.isEmpty()) {
            int textAreaH = splitY - by;
            int ty = by + Math.max(1, (textAreaH - 8) / 2);
            int tw = mc.font.width(msg);
            int tx = bx + bw / 2 - tw / 2;
            g.drawString(mc.font, msg, tx, ty, hov ? 0xFF00E5FF : 0xFFFFFFFF, true);
        }
    }

    private static boolean isShinseiSubScreen(String cls) {
        return cls.startsWith("net.minecraft.client.gui.screens.options")
            || cls.contains("LanguageSelectScreen")
            || cls.contains("VideoSettings")
            || cls.contains("ControlsScreen")
            || cls.contains("SoundOptions")
            || cls.contains("AccessibilityOptions")
            || cls.contains("ChatOptions");
    }
}

// =============================================================================
//  ShinseiTitleScreen — responsive dark-fantasy title screen
//
//  Render layer order (back → front, no z-fighting):
//    1. Solid base fill
//    2. Background artwork (cover-fit)
//    3. Left vignette + right gradient
//    4. Right panel dark backing + accent border
//    5. Ambient particles
//    6. UI text (title, tagline, separator, greeting)
//    7. Buttons (via super.render)
//    8. Version string
//    9. Fade-in overlay
// =============================================================================
class ShinseiTitleScreen extends Screen {

    // Particle count: 40 (halved from original for consistent perf at all resolutions)
    private static final int N = 40;

    // Background texture — loaded once, reused across screen rebuilds
    static ResourceLocation bgTex    = null;
    static boolean          bgLoaded = false;
    static int              bgNatW   = 1;
    static int              bgNatH   = 1;

    // Menu music — static + package-visible so ShinseiMenuMod.onClientTick can access it
    static SoundInstance currentMusic = null;

    // Particle state
    private final float[] px    = new float[N];
    private final float[] py    = new float[N];
    private final float[] spd   = new float[N];
    private final float[] amp   = new float[N];
    private final float[] phase = new float[N];
    private final float[] alf   = new float[N];
    private final float[] sz    = new float[N];
    private final int[]   kind  = new int[N];
    private final int[]   hue   = new int[N];
    private final Random  rng   = new Random();
    // violet / cyan / gold / lavender
    private static final int[] PCOLS = { 0x7c3aed, 0x06b6d4, 0xf59e0b, 0xa78bfa };

    // Animation
    private long  lastMs = -1;
    private float fadeIn = 0f;

    // Layout — all computed in init() from actual GUI-scaled screen dimensions
    private int   margin;       // lateral margin (~4% of width)
    private int   row1Y;        // top Y of main card row
    private int   row1H;        // height of main card row
    private int   row2Y;        // top Y of secondary button row
    private int   row2H;        // height of secondary button row
    private int   logoCx;       // horizontal center of the logo area (top-right)
    private int   logoTitleY;   // top Y of the SHINSEI title
    private float titleScale;   // scale factor for the SHINSEI title

    private String playerName = "";

    protected ShinseiTitleScreen() { super(Component.literal("SHINSEI")); }

    // ─────────────────────────────────────────────────────────────────────────
    //  init — recompute layout for the current screen size
    // ─────────────────────────────────────────────────────────────────────────
    @Override
    protected void init() {
        double guiScale = minecraft.getWindow().getGuiScale();
        ShinseiMenuMod.LOG.info("[SHINSEI] init W={} H={} guiScale={}", width, height, guiScale);

        loadBackground();
        if (minecraft.getUser() != null) playerName = minecraft.getUser().getName();

        // ── Constantes layout ─────────────────────────────────────────────
        margin     = width / 24;
        row2H      = height / 14;
        row1H      = height / 9;
        int gap    = Math.max(2, (width - margin * 2) / 60);
        int totalW = width - margin * 2;

        row2Y = height - margin - row2H;
        row1Y = row2Y - 4 - row1H;

        // Logo haut-droit (45 % droite de l'écran)
        int logoAreaX = (int)(width * 0.55f);
        logoCx        = logoAreaX + (width - logoAreaX) / 2;
        logoTitleY    = height / 12;
        int rawW      = calcSpacedWidth("SHINSEI");
        titleScale    = clampF((width - logoAreaX) * 0.70f / rawW, 1.4f, 3.8f);

        // ── RANGÉE 1 — cartes principales ────────────────────────────────
        int btn1W = (totalW * 2 / 3) - gap / 2;
        addRenderableWidget(new ShinseiCard(
            margin, row1Y, btn1W, row1H,
            "CREER TON HISTOIRE", "COMMENCER L'AVENTURE",
            CardStyle.PRIMARY, this::connectToServer));

        int btn2X = margin + btn1W + gap;
        int btn2W = totalW - btn1W - gap;
        addRenderableWidget(new ShinseiCard(
            btn2X, row1Y, btn2W, row1H,
            "BOUTIQUE", null,
            CardStyle.SECONDARY, this::openShop));

        // ── RANGÉE 2 — boutons texte secondaires ─────────────────────────
        int optW     = (int)(font.width(toSpaced("OPTIONS")) * 1.2f) + 10;
        int quitW    = (int)(font.width(toSpaced("QUITTER")) * 1.2f) + 10;
        int optionsX = (int)(width * 0.04f);
        int quitterX = (int)(width * 0.96f) - quitW;
        addRenderableWidget(new ShinseiTextButton(
            optionsX, row2Y, optW, row2H, "OPTIONS", this::openOptions));
        addRenderableWidget(new ShinseiTextButton(
            quitterX, row2Y, quitW, row2H, "QUITTER", () -> minecraft.stop()));

        for (int i = 0; i < N; i++) spawnParticle(i, true);
        fadeIn = 0f;
        lastMs = -1;

        // Stop Minecraft's default music immediately, then start ours
        manageMusicTick(minecraft);
    }

    static void manageMusicTick(Minecraft mc) {
        // Stop whatever Minecraft's MusicManager is playing (default title/biome music)
        try {
            java.lang.reflect.Field fCur = mc.getMusicManager().getClass().getDeclaredField("currentMusic");
            fCur.setAccessible(true);
            SoundInstance mcMusic = (SoundInstance) fCur.get(mc.getMusicManager());
            if (mcMusic != null && mcMusic != currentMusic) {
                mc.getSoundManager().stop(mcMusic);
                fCur.set(mc.getMusicManager(), null);
            }
            // Push the MusicManager's next-song delay far into the future
            try {
                java.lang.reflect.Field fDelay = mc.getMusicManager().getClass().getDeclaredField("nextSongDelay");
                fDelay.setAccessible(true);
                fDelay.setInt(mc.getMusicManager(), Integer.MAX_VALUE);
            } catch (Throwable ignored) {}
        } catch (Throwable t) {
            ShinseiMenuMod.LOG.warn("[SHINSEI] MusicManager stop: {}", t.toString());
        }

        // Play our music if not already active
        if (currentMusic == null || !mc.getSoundManager().isActive(currentMusic)) {
            currentMusic = new SimpleSoundInstance(
                ResourceLocation.fromNamespaceAndPath("shinsei", "menu.music"),
                SoundSource.MUSIC, 1.0f, 1.0f, RandomSource.create(),
                true, 0, SoundInstance.Attenuation.NONE,
                0.0, 0.0, 0.0, true
            );
            mc.getSoundManager().play(currentMusic);
        }
    }

    private void loadBackground() {
        if (bgLoaded) return;
        bgLoaded = true;
        try {
            Path p = FMLPaths.GAMEDIR.get().resolve("shinsei-ingame.png");
            if (Files.exists(p)) {
                try (InputStream is = Files.newInputStream(p)) {
                    NativeImage ni = NativeImage.read(is);
                    bgNatW = ni.getWidth();
                    bgNatH = ni.getHeight();
                    bgTex  = minecraft.getTextureManager()
                                 .register("shinsei_bg", new DynamicTexture(ni));
                    ShinseiMenuMod.LOG.info("[SHINSEI] background {}x{}", bgNatW, bgNatH);
                }
            } else {
                ShinseiMenuMod.LOG.warn("[SHINSEI] shinsei-ingame.png manquant dans {}", FMLPaths.GAMEDIR.get());
            }
        } catch (Exception ex) {
            ShinseiMenuMod.LOG.error("[SHINSEI] Erreur chargement background", ex);
        }
    }

    private void spawnParticle(int i, boolean anywhere) {
        px[i]    = rng.nextFloat() * width;
        py[i]    = anywhere ? rng.nextFloat() * height : height + rng.nextFloat() * 20 + 5;
        spd[i]   = 0.08f + rng.nextFloat() * 0.34f;
        amp[i]   = 6f    + rng.nextFloat() * 20f;
        phase[i] = rng.nextFloat() * (float)(Math.PI * 2);
        alf[i]   = 0.20f + rng.nextFloat() * 0.50f;
        sz[i]    = 1f    + rng.nextFloat() * 2f;
        kind[i]  = rng.nextInt(3);
        int r = rng.nextInt(10);
        hue[i]   = r < 4 ? 0 : r < 8 ? 1 : r < 9 ? 2 : 3;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  render
    // ─────────────────────────────────────────────────────────────────────────
    @Override
    public void render(GuiGraphics g, int mx, int my, float delta) {
        long now = System.currentTimeMillis();
        if (lastMs < 0) lastMs = now;
        float dt = Math.min(0.08f, (now - lastMs) / 1000f);
        lastMs   = now;
        fadeIn   = Math.min(1f, fadeIn + dt * 2.5f);
        double sec = now / 1000.0;

        int W = width, H = height;

        g.fill(0, 0, W, H, 0xFF04040D);      // 1. base fill
        renderBackground(g, W, H);            // 2. artwork
        renderVignette(g, W, H);              // 3. vignettes
        tickParticles(dt, sec, W, H);         // 4. particules
        renderParticles(g);
        renderText(g, W, H, sec);             // 5. logo + texte
        super.render(g, mx, my, delta);       // 6. cartes + boutons texte

        // Version — alignée à droite dans la rangée 2
        String ver = "1.21.1  •  Forge 52";
        g.drawString(font, ver,
            W / 2 - font.width(ver) / 2,
            row2Y + (row2H - 8) / 2,
            0xFF4A2D6A, false);

        if (fadeIn < 1f) {                    // 7. fade-in
            g.fill(0, 0, W, H, ((int)((1f - easeOut(fadeIn)) * 255)) << 24);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Layer 2: background artwork (cover-fit)
    // ─────────────────────────────────────────────────────────────────────────
    private void renderBackground(GuiGraphics g, int W, int H) {
        if (bgTex == null || bgNatW <= 0 || bgNatH <= 0) {
            g.fill(0, 0, W, H, 0xFF07071A);
            return;
        }
        // Cover-fit: scale = max(scX, scY) fills screen, crops excess — confirmed correct.
        // Image is 1672×941 (≈16:9); no shader blur exists in this mod.
        float sc = Math.max((float)W / bgNatW, (float)H / bgNatH);
        int   dW = Math.round(bgNatW * sc);
        int   dH = Math.round(bgNatH * sc);
        int   ox = (W - dW) / 2;
        int   oy = (H - dH) / 2;

        RenderSystem.setShaderColor(1.0f, 1.0f, 1.0f, 1.0f);
        g.pose().pushPose();
        g.pose().translate(ox, oy, 0f);
        g.pose().scale(sc, sc, 1f);
        g.blit(bgTex, 0, 0, 0f, 0f, bgNatW, bgNatH, bgNatW, bgNatH);
        g.pose().popPose();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Layer 3: vignettes — left edge + artwork-to-panel transition
    // ─────────────────────────────────────────────────────────────────────────
    private void renderVignette(GuiGraphics g, int W, int H) {
        // Bord gauche
        int leftEdge = (int)(W * 0.06f);
        for (int x = 0; x < leftEdge; x++) {
            float t = 1f - (float)x / leftEdge;
            g.fill(x, 0, x + 1, H, ((int)(80 * t * t)) << 24);
        }

        // Haut — discret, aide la lisibilité du logo
        int topH = H / 5;
        for (int y = 0; y < topH; y++) {
            float t = 1f - (float)y / topH;
            g.fill(0, y, W, y + 1, ((int)(60 * t * t)) << 24);
        }

        // Bas — fondu plein écran derrière les boutons
        int bStart = row1Y - 24;
        for (int y = Math.max(0, bStart); y < H; y++) {
            float t = (float)(y - bStart) / Math.max(1, H - bStart);
            g.fill(0, y, W, y + 1, ((int)(200 * t * t)) << 24);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Layer 4: particles
    // ─────────────────────────────────────────────────────────────────────────
    private void tickParticles(float dt, double sec, int W, int H) {
        for (int i = 0; i < N; i++) {
            py[i] -= spd[i] * dt * 60f;
            float dSine = (float)(
                Math.sin(sec * 0.5 + phase[i]) - Math.sin((sec - dt) * 0.5 + phase[i])
            ) * amp[i];
            px[i] += dSine;
            // Fade out near the top quarter
            if (py[i] < H * 0.22f) alf[i] = Math.max(0f, alf[i] - dt * 1.2f);
            // Wrap horizontally
            if      (px[i] < -20)   px[i] += W + 40;
            else if (px[i] > W + 20) px[i] -= W + 40;
            // Respawn when gone
            if (py[i] < -20 || alf[i] < 0.02f) spawnParticle(i, false);
        }
    }

    private void renderParticles(GuiGraphics g) {
        for (int i = 0; i < N; i++) {
            int base  = PCOLS[hue[i]];
            int col   = ((int)(alf[i] * 170) << 24) | base;
            int glow  = ((int)(alf[i] *  30) << 24) | base;
            int x = (int)px[i], y = (int)py[i];
            int s = Math.max(1, (int)sz[i]);
            switch (kind[i]) {
                case 0 -> { // cross
                    g.fill(x - s,     y,         x + s + 1, y + 1,     col);
                    g.fill(x,         y - s,     x + 1,     y + s + 1, col);
                    g.fill(x - s - 1, y - 1,     x + s + 2, y + 2,     glow);
                    g.fill(x - 1,     y - s - 1, x + 2,     y + s + 2, glow);
                }
                case 1 -> { // square with glow halo
                    g.fill(x - s - 1, y - s - 1, x + s + 2, y + s + 2, glow);
                    g.fill(x - s,     y - s,     x + s + 1, y + s + 1, col);
                }
                default -> { // dot
                    if (s > 1) g.fill(x - 1, y - 1, x + s + 1, y + s + 1, glow);
                    g.fill(x, y, x + s, y + s, col);
                }
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Layer 6: UI text
    // ─────────────────────────────────────────────────────────────────────────
    private void renderText(GuiGraphics g, int W, int H, double sec) {
        // ── Logo SHINSEI (haut-droit) ─────────────────────────────────────
        String title   = "SHINSEI";
        int    spacedW = calcSpacedWidth(title);
        int    realW   = Math.round(spacedW * titleScale);
        int    titleX  = logoCx - realW / 2;
        int    titleBH = Math.round(9 * titleScale);

        float glowPulse  = (float)(Math.sin(sec * 1.6) * 0.5 + 0.5);
        int   outerAlpha = (int)(18 + 28 * glowPulse);
        int   innerAlpha = (int)(35 + 55 * glowPulse);
        g.fill(titleX - 20, logoTitleY - 8,
               titleX + realW + 20, logoTitleY + titleBH + 12,
               (outerAlpha << 24) | 0x7c3aed);
        g.fill(titleX - 8, logoTitleY - 3,
               titleX + realW + 8, logoTitleY + titleBH + 5,
               (innerAlpha << 24) | 0x5500cc);

        g.pose().pushPose();
        g.pose().scale(titleScale, titleScale, 1f);
        int cx = Math.round(titleX / titleScale);
        int cy = Math.round(logoTitleY / titleScale);
        for (int i = 0; i < title.length(); i++) {
            float t   = (float)i / Math.max(1, title.length() - 1);
            int   col = lerpRGB(0xFFD8CCFF, 0xFF00E5FF, t);
            String ch = String.valueOf(title.charAt(i));
            g.drawString(font, ch, cx, cy, col, true);
            cx += font.width(ch) + 1;
        }
        g.pose().popPose();

        // ── Tagline ────────────────────────────────────────────────────────
        String tag  = "S E R V E U R   R P G   F R";
        int    tagY = logoTitleY + titleBH + 7;
        g.drawString(font, tag, logoCx - font.width(tag) / 2, tagY, 0x55c8d8f8, false);

        // ── Séparateur animé ───────────────────────────────────────────────
        int   lineY  = tagY + 13;
        int   lineW  = (int)((W - (int)(W * 0.55f)) * 0.50f);
        int   lineX0 = logoCx - lineW / 2;
        float shift  = (float)(sec * 0.28 % 1.0);
        for (int x = 0; x < lineW; x++) {
            float f  = ((float)x / lineW + shift) % 1f;
            int   la = (int)(100 * Math.sin(Math.PI * f));
            g.fill(lineX0 + x, lineY, lineX0 + x + 1, lineY + 1, (la << 24) | 0x7c3aed);
        }

        // ── Pseudo joueur (haut-gauche) ────────────────────────────────────
        if (!playerName.isEmpty()) {
            int greetY = H / 16;
            g.fill(margin, greetY + 2, margin + 2, greetY + 8, 0xFF06b6d4);
            g.drawString(font, "  " + playerName, margin + 2, greetY, 0xBB06b6d4, true);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /** Mirrors ShinseiTextButton letter-spacing: inserts a space between each char. */
    private static String toSpaced(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            sb.append(s.charAt(i));
            if (i < s.length() - 1) sb.append(' ');
        }
        return sb.toString();
    }

    /** Width (in font units) of a string with +1 inter-char spacing. */
    private int calcSpacedWidth(String s) {
        int w = 0;
        for (int i = 0; i < s.length(); i++) {
            w += font.width(String.valueOf(s.charAt(i)));
            if (i < s.length() - 1) w += 1;
        }
        return w;
    }

    private static float easeOut(float t) { return 1f - (1f - t) * (1f - t); }

    static int lerpRGB(int a, int b, float t) {
        int ar = (a >> 16) & 0xFF, ag = (a >> 8) & 0xFF, ab = a & 0xFF;
        int br = (b >> 16) & 0xFF, bg = (b >> 8) & 0xFF, bb = b & 0xFF;
        return 0xFF000000
            | ((ar + (int)((br - ar) * t)) << 16)
            | ((ag + (int)((bg - ag) * t)) << 8)
            |  (ab + (int)((bb - ab) * t));
    }

    private static int clamp(int v, int lo, int hi) { return Math.max(lo, Math.min(hi, v)); }
    private static float clampF(float v, float lo, float hi) { return Math.max(lo, Math.min(hi, v)); }

    @Override public boolean isPauseScreen() { return false; }
    @Override public void onClose() {}

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        ShinseiMenuMod.LOG.info("[SHINSEI] click at ({},{}) btn={} | optHitbox=[{},{}]w{}h{}",
            (int)mouseX, (int)mouseY, button,
            (int)(width * 0.04f), row2Y,
            (int)(font.width(toSpaced("OPTIONS")) * 1.2f) + 10, row2H);
        return super.mouseClicked(mouseX, mouseY, button);
    }

    // Suppress Minecraft's default panorama+blur background so our artwork shows clean
    @Override
    public void renderBackground(GuiGraphics g, int mx, int my, float pt) {}

    // ─────────────────────────────────────────────────────────────────────────
    //  Button actions (reflection-based for forward compat)
    // ─────────────────────────────────────────────────────────────────────────
    private void connectToServer() {
        try {
            Class<?> aC = Class.forName("net.minecraft.client.multiplayer.resolver.ServerAddress");
            Class<?> sC = Class.forName("net.minecraft.client.multiplayer.ServerData");
            Class<?> cS = Class.forName("net.minecraft.client.gui.screens.ConnectScreen");
            Object addr = aC.getMethod("parseString", String.class).invoke(null, ShinseiMenuMod.SERVER_IP);
            Object sd;
            try {
                Class<?> te = Class.forName("net.minecraft.client.multiplayer.ServerData$Type");
                Object oth  = java.util.Arrays.stream(te.getEnumConstants())
                    .filter(c -> c.toString().equals("OTHER")).findFirst().orElse(null);
                sd = oth != null
                    ? sC.getConstructor(String.class, String.class, te)
                          .newInstance("SHINSEI", ShinseiMenuMod.SERVER_IP, oth)
                    : sC.getConstructor(String.class, String.class, boolean.class)
                          .newInstance("SHINSEI", ShinseiMenuMod.SERVER_IP, false);
            } catch (Exception x) {
                sd = sC.getConstructor(String.class, String.class, boolean.class)
                        .newInstance("SHINSEI", ShinseiMenuMod.SERVER_IP, false);
            }
            cS.getMethod("startConnecting",
                         Screen.class, Minecraft.class, aC, sC, boolean.class, Object.class)
              .invoke(null, this, minecraft, addr, sd, false, null);
        } catch (Exception e) {
            try {
                Class<?> mp = Class.forName("net.minecraft.client.gui.screens.multiplayer.JoinMultiplayerScreen");
                minecraft.setScreen((Screen) mp.getConstructor(Screen.class).newInstance(this));
            } catch (Exception ignored) {}
        }
    }

    private void openShop() {
        try { Desktop.getDesktop().browse(new URI(ShinseiMenuMod.SHOP_URL)); }
        catch (Exception ignored) {}
    }

    private void openOptions() {
        ShinseiMenuMod.LOG.info("[SHINSEI] OPTIONS clicked");
        minecraft.setScreen(new ShinseiOptionsScreen(this));
    }
}

enum CardStyle { PRIMARY, SECONDARY }

// =============================================================================
//  ShinseiOptionsScreen — écran d'options aux couleurs Shinsei
// =============================================================================
class ShinseiOptionsScreen extends Screen {

    private static final int N = 25;
    private final float[] px    = new float[N], py    = new float[N],
                           spd  = new float[N], amp   = new float[N],
                           phase = new float[N], alf  = new float[N],
                           sz   = new float[N];
    private final int[]    kind = new int[N],   hue   = new int[N];
    private final Random   rng  = new Random();
    private static final int[] PCOLS = { 0x7c3aed, 0x06b6d4, 0xf59e0b, 0xa78bfa };
    private long  lastMs = -1;
    private float fadeIn = 0f;

    private final Screen parent;
    private int margin, row1Y, row1H, row2Y, row2H, bottomY, bottomH;

    ShinseiOptionsScreen(Screen parent) {
        super(Component.literal("OPTIONS"));
        this.parent = parent;
    }

    @Override
    protected void init() {
        margin   = width / 24;
        int gap  = Math.max(2, (width - margin * 2) / 60);
        int totW = width - margin * 2;

        bottomH = height / 14;
        row1H   = height / 9;
        row2H   = height / 9;

        bottomY = height - margin - bottomH;
        row2Y   = bottomY - 4 - row2H;
        row1Y   = row2Y   - 4 - row1H;

        int cardW = (totW - gap * 2) / 3;

        // ── Rangée 1 — SON · VIDEO · CONTROLES ───────────────────────────
        addRenderableWidget(new ShinseiCard(
            margin, row1Y, cardW, row1H,
            "SON", "MUSIQUE & EFFETS", CardStyle.PRIMARY,
            () -> openSub("net.minecraft.client.gui.screens.options.SoundOptionsScreen")));
        addRenderableWidget(new ShinseiCard(
            margin + cardW + gap, row1Y, cardW, row1H,
            "VIDEO", "GRAPHISMES", CardStyle.SECONDARY,
            () -> openSub("net.minecraft.client.gui.screens.options.VideoSettingsScreen")));
        addRenderableWidget(new ShinseiCard(
            margin + (cardW + gap) * 2, row1Y, cardW, row1H,
            "CONTROLES", "TOUCHES & SOURIS", CardStyle.SECONDARY,
            () -> openSub(
                "net.minecraft.client.gui.screens.options.controls.ControlsScreen",
                "net.minecraft.client.gui.screens.controls.ControlsScreen")));

        // ── Rangée 2 — LANGUE · CHAT · ACCES ─────────────────────────────
        addRenderableWidget(new ShinseiCard(
            margin, row2Y, cardW, row2H,
            "LANGUE", null, CardStyle.SECONDARY,
            () -> openSub("net.minecraft.client.gui.screens.options.LanguageSelectScreen")));
        addRenderableWidget(new ShinseiCard(
            margin + cardW + gap, row2Y, cardW, row2H,
            "CHAT", null, CardStyle.SECONDARY,
            () -> openSub("net.minecraft.client.gui.screens.options.ChatOptionsScreen")));
        addRenderableWidget(new ShinseiCard(
            margin + (cardW + gap) * 2, row2Y, cardW, row2H,
            "ACCES", "ACCESSIBILITE", CardStyle.SECONDARY,
            () -> openSub("net.minecraft.client.gui.screens.options.AccessibilityOptionsScreen")));

        // ── Bouton RETOUR ────────────────────────────────────────────────
        int retW = (int)(font.width(toSpaced("RETOUR")) * 1.2f) + 10;
        addRenderableWidget(new ShinseiTextButton(
            (int)(width * 0.04f), bottomY, retW, bottomH,
            "RETOUR", () -> minecraft.setScreen(parent)));

        for (int i = 0; i < N; i++) spawnParticle(i, true);
        fadeIn = 0f;
        lastMs = -1;
    }

    private void openSub(String... names) {
        ClassLoader cl = ShinseiOptionsScreen.class.getClassLoader();
        for (String name : names) {
            try {
                Class<?> cls = Class.forName(name, true, cl);
                for (java.lang.reflect.Constructor<?> ctor : cls.getConstructors()) {
                    Class<?>[] pt = ctor.getParameterTypes();
                    if (pt.length < 1 || !Screen.class.isAssignableFrom(pt[0])) continue;
                    try {
                        Screen result = null;
                        if (pt.length == 1) {
                            result = (Screen) ctor.newInstance(this);
                        } else if (pt.length == 2) {
                            result = (Screen) ctor.newInstance(this, minecraft.options);
                        } else if (pt.length == 3) {
                            Object p1 = resolveArg(pt[1]);
                            Object p2 = resolveArg(pt[2]);
                            if (p1 != null && p2 != null)
                                try { result = (Screen) ctor.newInstance(this, p1, p2); } catch (Throwable ignored) {}
                            if (result == null && p1 != null && p2 != null)
                                try { result = (Screen) ctor.newInstance(this, p2, p1); } catch (Throwable ignored) {}
                        }
                        if (result != null) { minecraft.setScreen(result); return; }
                    } catch (Throwable ignored) {}
                }
            } catch (ClassNotFoundException ignored) {
            } catch (Throwable e) {
                ShinseiMenuMod.LOG.error("[SHINSEI] openSub {} : {}", name, e.toString());
            }
        }
        ShinseiMenuMod.LOG.warn("[SHINSEI] SubScreen non trouve: {}", java.util.Arrays.toString(names));
    }

    private Object getLangManager() {
        try {
            java.lang.reflect.Field f = Minecraft.class.getDeclaredField("languageManager");
            f.setAccessible(true);
            return f.get(minecraft);
        } catch (Throwable ignored) {}
        try { return minecraft.getClass().getMethod("getLanguageManager").invoke(minecraft); }
        catch (Throwable ignored) {}
        return null;
    }

    private Object resolveArg(Class<?> type) {
        if (type.isAssignableFrom(minecraft.getClass())) return minecraft;
        if (type.isAssignableFrom(minecraft.options.getClass())) return minecraft.options;
        Object lm = getLangManager();
        if (lm != null && type.isAssignableFrom(lm.getClass())) return lm;
        return null;
    }

    @Override
    public void render(GuiGraphics g, int mx, int my, float delta) {
        long now = System.currentTimeMillis();
        if (lastMs < 0) lastMs = now;
        float dt = Math.min(0.08f, (now - lastMs) / 1000f);
        lastMs = now;
        fadeIn = Math.min(1f, fadeIn + dt * 2.5f);
        double sec = now / 1000.0;
        int W = width, H = height;

        g.fill(0, 0, W, H, 0xFF04040D);
        renderBg(g, W, H);
        renderVignette(g, W, H);
        tickParticles(dt, sec, W, H);
        renderParticles(g);
        renderTitle(g, W, H, sec);
        super.render(g, mx, my, delta);
        if (fadeIn < 1f)
            g.fill(0, 0, W, H, ((int)((1f - easeOut(fadeIn)) * 255)) << 24);
    }

    private void renderBg(GuiGraphics g, int W, int H) {
        if (ShinseiTitleScreen.bgTex == null || ShinseiTitleScreen.bgNatW <= 0) {
            g.fill(0, 0, W, H, 0xFF07071A); return;
        }
        float sc = Math.max((float)W / ShinseiTitleScreen.bgNatW,
                            (float)H / ShinseiTitleScreen.bgNatH);
        int dW = Math.round(ShinseiTitleScreen.bgNatW * sc);
        int dH = Math.round(ShinseiTitleScreen.bgNatH * sc);
        int ox = (W - dW) / 2, oy = (H - dH) / 2;
        RenderSystem.setShaderColor(1f, 1f, 1f, 1f);
        g.pose().pushPose();
        g.pose().translate(ox, oy, 0f);
        g.pose().scale(sc, sc, 1f);
        g.blit(ShinseiTitleScreen.bgTex, 0, 0, 0f, 0f,
            ShinseiTitleScreen.bgNatW, ShinseiTitleScreen.bgNatH,
            ShinseiTitleScreen.bgNatW, ShinseiTitleScreen.bgNatH);
        g.pose().popPose();
    }

    private void renderVignette(GuiGraphics g, int W, int H) {
        int le = (int)(W * 0.06f);
        for (int x = 0; x < le; x++) {
            float t = 1f - (float)x / le;
            g.fill(x, 0, x + 1, H, ((int)(80 * t * t)) << 24);
        }
        int bs = row1Y - 24;
        for (int y = Math.max(0, bs); y < H; y++) {
            float t = (float)(y - bs) / Math.max(1, H - bs);
            g.fill(0, y, W, y + 1, ((int)(200 * t * t)) << 24);
        }
    }

    private void renderTitle(GuiGraphics g, int W, int H, double sec) {
        String title = "OPTIONS";
        float ts = 2.0f;
        int sw = 0;
        for (int i = 0; i < title.length(); i++) {
            sw += font.width(String.valueOf(title.charAt(i)));
            if (i < title.length() - 1) sw += 1;
        }
        int realW  = Math.round(sw * ts);
        int tx     = W / 2 - realW / 2;
        int ty     = H / 9;
        int titleBH = Math.round(9 * ts);
        float gp   = (float)(Math.sin(sec * 1.6) * 0.5 + 0.5);
        g.fill(tx - 20, ty - 8,  tx + realW + 20, ty + titleBH + 12, ((int)(18 + 28 * gp) << 24) | 0x7c3aed);
        g.fill(tx - 8,  ty - 3,  tx + realW + 8,  ty + titleBH + 5,  ((int)(35 + 55 * gp) << 24) | 0x5500cc);
        g.pose().pushPose();
        g.pose().scale(ts, ts, 1f);
        int cx = Math.round(tx / ts), cy = Math.round(ty / ts);
        for (int i = 0; i < title.length(); i++) {
            float t  = (float)i / Math.max(1, title.length() - 1);
            int   col = ShinseiTitleScreen.lerpRGB(0xFFD8CCFF, 0xFF00E5FF, t);
            String ch = String.valueOf(title.charAt(i));
            g.drawString(font, ch, cx, cy, col, true);
            cx += font.width(ch) + 1;
        }
        g.pose().popPose();
    }

    private void spawnParticle(int i, boolean anywhere) {
        px[i]    = rng.nextFloat() * width;
        py[i]    = anywhere ? rng.nextFloat() * height : height + rng.nextFloat() * 20 + 5;
        spd[i]   = 0.08f + rng.nextFloat() * 0.34f;
        amp[i]   = 6f    + rng.nextFloat() * 20f;
        phase[i] = rng.nextFloat() * (float)(Math.PI * 2);
        alf[i]   = 0.20f + rng.nextFloat() * 0.50f;
        sz[i]    = 1f    + rng.nextFloat() * 2f;
        kind[i]  = rng.nextInt(3);
        int r = rng.nextInt(10);
        hue[i]   = r < 4 ? 0 : r < 8 ? 1 : r < 9 ? 2 : 3;
    }

    private void tickParticles(float dt, double sec, int W, int H) {
        for (int i = 0; i < N; i++) {
            py[i] -= spd[i] * dt * 60f;
            px[i] += (float)(Math.sin(sec * 0.5 + phase[i]) -
                             Math.sin((sec - dt) * 0.5 + phase[i])) * amp[i];
            if (py[i] < H * 0.22f) alf[i] = Math.max(0f, alf[i] - dt * 1.2f);
            if      (px[i] < -20)    px[i] += W + 40;
            else if (px[i] > W + 20) px[i] -= W + 40;
            if (py[i] < -20 || alf[i] < 0.02f) spawnParticle(i, false);
        }
    }

    private void renderParticles(GuiGraphics g) {
        for (int i = 0; i < N; i++) {
            int base = PCOLS[hue[i]];
            int col  = ((int)(alf[i] * 170) << 24) | base;
            int glow = ((int)(alf[i] *  30) << 24) | base;
            int x = (int)px[i], y = (int)py[i], s = Math.max(1, (int)sz[i]);
            switch (kind[i]) {
                case 0 -> {
                    g.fill(x-s, y, x+s+1, y+1, col);   g.fill(x, y-s, x+1, y+s+1, col);
                    g.fill(x-s-1, y-1, x+s+2, y+2, glow); g.fill(x-1, y-s-1, x+2, y+s+2, glow);
                }
                case 1 -> { g.fill(x-s-1, y-s-1, x+s+2, y+s+2, glow); g.fill(x-s, y-s, x+s+1, y+s+1, col); }
                default -> { if (s > 1) g.fill(x-1, y-1, x+s+1, y+s+1, glow); g.fill(x, y, x+s, y+s, col); }
            }
        }
    }

    private static String toSpaced(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            sb.append(s.charAt(i));
            if (i < s.length() - 1) sb.append(' ');
        }
        return sb.toString();
    }

    private static float easeOut(float t) { return 1f - (1f - t) * (1f - t); }

    @Override public boolean isPauseScreen() { return false; }
    @Override public void onClose() { minecraft.setScreen(parent); }
    @Override public void renderBackground(GuiGraphics g, int mx, int my, float pt) {}
}

// =============================================================================
//  ShinseiCard — carte titre+sous-titre, fond semi-transparent, bordure colorée
// =============================================================================
class ShinseiCard extends AbstractButton {

    private final String    title;
    private final String    subtitle;  // null = pas de sous-titre
    private final CardStyle style;
    private final Runnable  action;
    private final float     tScale;    // scale du titre

    ShinseiCard(int x, int y, int w, int h,
                String title, String subtitle, CardStyle style, Runnable action) {
        super(x, y, w, h, Component.literal(title));
        this.title    = title;
        this.subtitle = subtitle;
        this.style    = style;
        this.action   = action;
        this.tScale   = Math.max(1.0f, Math.min(2.5f, h / 30f));
    }

    @Override public void onPress() { action.run(); }

    @Override
    public void updateWidgetNarration(NarrationElementOutput out) {
        defaultButtonNarrationText(out);
    }

    @Override
    public void renderWidget(GuiGraphics g, int mx, int my, float delta) {
        boolean hov    = isHovered();
        int     bx     = getX(), by = getY(), bw = getWidth(), bh = getHeight();
        int     accent = style == CardStyle.PRIMARY ? 0x00E5FF : 0x7C3AED;

        // Fond
        g.fill(bx, by, bx + bw, by + bh,
               hov ? ((0x18 << 24) | accent) : 0x8C0A0212);

        // Bordure 1 px
        int ba = hov
            ? (style == CardStyle.PRIMARY ? 0xE5 : 0xCC)
            : (style == CardStyle.PRIMARY ? 0x7F : 0x66);
        int border = (ba << 24) | accent;
        g.fill(bx,          by,          bx + bw,     by + 1,      border);
        g.fill(bx,          by + bh - 1, bx + bw,     by + bh,     border);
        g.fill(bx,          by,          bx + 1,      by + bh,     border);
        g.fill(bx + bw - 1, by,          bx + bw,     by + bh,     border);

        // Calcul position verticale du bloc texte
        int titlePx    = Math.round(9 * tScale);
        int textBlockH = subtitle != null ? titlePx + 5 + 8 : titlePx;
        int startY     = by + (bh - textBlockH) / 2;

        // Titre (scalé, centré)
        int titleCol = (hov || style == CardStyle.PRIMARY) ? 0xFFFFFFFF : 0xFFC4B5FD;
        var fnt = Minecraft.getInstance().font;
        int tw = 0;
        for (int i = 0; i < title.length(); i++) {
            tw += fnt.width(String.valueOf(title.charAt(i)));
            if (i < title.length() - 1) tw += 1;
        }
        g.pose().pushPose();
        g.pose().translate(bx + bw / 2f - (tw * tScale) / 2f, startY, 0f);
        g.pose().scale(tScale, tScale, 1f);
        int cx = 0;
        for (int i = 0; i < title.length(); i++) {
            String ch = String.valueOf(title.charAt(i));
            g.drawString(fnt, ch, cx, 0, titleCol, true);
            cx += fnt.width(ch) + 1;
        }
        g.pose().popPose();

        // Sous-titre (taille normale, centré)
        if (subtitle != null) {
            g.drawCenteredString(fnt, subtitle,
                bx + bw / 2, startY + titlePx + 5, 0xFF4DD0E1);
        }
    }
}

// =============================================================================
//  ShinseiTextButton — bouton texte sans fond ni bordure (rangée 2)
// =============================================================================
class ShinseiTextButton extends AbstractButton {

    private final Runnable action;

    ShinseiTextButton(int x, int y, int w, int h, String label, Runnable action) {
        super(x, y, w, h, Component.literal(label));
        this.action = action;
    }

    @Override public void onPress() { action.run(); }

    @Override
    public void updateWidgetNarration(NarrationElementOutput out) {
        defaultButtonNarrationText(out);
    }

    @Override
    public void renderWidget(GuiGraphics g, int mx, int my, float delta) {
        boolean hov = isHovered();
        var fnt = Minecraft.getInstance().font;
        String lbl = getMessage().getString();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < lbl.length(); i++) {
            sb.append(lbl.charAt(i));
            if (i < lbl.length() - 1) sb.append(' ');
        }
        String spaced = sb.toString();
        int   col = hov ? 0xFFFFFFFF : 0xFF00E5FF;
        float sc  = 1.2f;
        int   sw  = (int)(fnt.width(spaced) * sc);
        int   tx  = getX() + (getWidth()  - sw) / 2;
        int   ty  = getY() + (getHeight() - 9) / 2;
        // Ombre manuelle +1px
        g.pose().pushPose();
        g.pose().translate(tx + 1, ty + 1, 0f);
        g.pose().scale(sc, sc, 1f);
        g.drawString(fnt, spaced, 0, 0, 0x99000000, false);
        g.pose().popPose();
        // Texte principal
        g.pose().pushPose();
        g.pose().translate(tx, ty, 0f);
        g.pose().scale(sc, sc, 1f);
        g.drawString(fnt, spaced, 0, 0, col, false);
        g.pose().popPose();
        if (hov) g.fill(tx, ty + 11, tx + sw, ty + 12, 0x9900E5FF);
    }
}
