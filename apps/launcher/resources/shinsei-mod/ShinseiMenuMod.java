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
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.ScreenEvent;
import net.minecraftforge.common.MinecraftForge;
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

    static final Logger LOG = LogManager.getLogger("SHINSEI");
    static final String SERVER_IP = "localhost:25565";
    static final String SHOP_URL  = "https://shinsei.fr/boutique";

    public ShinseiMenuMod() {
        LOG.info("[SHINSEI] Mod constructeur appelé — v10");
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onOpening(ScreenEvent.Opening e) {
        Screen ns = e.getNewScreen();
        if (ns instanceof TitleScreen && !(ns instanceof ShinseiTitleScreen)) {
            LOG.info("[SHINSEI] Interception TitleScreen → ShinseiTitleScreen");
            e.setNewScreen(new ShinseiTitleScreen());
        }
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onInitPost(ScreenEvent.Init.Post e) {
        if (e.getScreen() instanceof TitleScreen && !(e.getScreen() instanceof ShinseiTitleScreen)) {
            LOG.info("[SHINSEI] Init.Post TitleScreen détecté — remplacement");
            Minecraft.getInstance().setScreen(new ShinseiTitleScreen());
        }
    }
}

// =============================================================================

class ShinseiTitleScreen extends Screen {

    // ── Background ────────────────────────────────────────────────────────────
    private static ResourceLocation bgTex    = null;
    private static boolean          bgLoaded = false;
    private static int              bgNatW   = 1;
    private static int              bgNatH   = 1;

    // ── Particle system ───────────────────────────────────────────────────────
    private static final int N = 80;
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

    // violet, cyan, gold, lavender
    private static final int[] PCOLS = { 0x7c3aed, 0x06b6d4, 0xf59e0b, 0xa78bfa };

    // ── Animation ─────────────────────────────────────────────────────────────
    private long  lastMs = -1;
    private float fadeIn = 0f;

    // ── Layout ────────────────────────────────────────────────────────────────
    private int    txX;
    private int    btnH;
    private int    btnMaxW;
    private String playerName = "";

    protected ShinseiTitleScreen() { super(Component.literal("SHINSEI")); }

    // ── init ─────────────────────────────────────────────────────────────────
    @Override
    protected void init() {
        ShinseiMenuMod.LOG.info("[SHINSEI] ShinseiTitleScreen.init() W={} H={}", width, height);

        if (!bgLoaded) {
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
                        ShinseiMenuMod.LOG.info("[SHINSEI] Background chargé {}x{}", bgNatW, bgNatH);
                    }
                } else {
                    ShinseiMenuMod.LOG.warn("[SHINSEI] shinsei-ingame.png introuvable dans {}", FMLPaths.GAMEDIR.get());
                }
            } catch (Exception ex) {
                ShinseiMenuMod.LOG.error("[SHINSEI] Erreur chargement background", ex);
            }
        }

        if (minecraft.getUser() != null) playerName = minecraft.getUser().getName();

        txX     = (int)(width  * 0.54f);
        btnH    = Math.max(16, (int)(height * 0.075f));
        btnMaxW = Math.max(150, width - txX - 20);

        fadeIn = 0f;
        lastMs = -1;

        int b1Y = (int)(height * 0.46f);
        int gap = (int)(height * 0.088f);
        addW(btnX(), b1Y,           "Creer ton histoire", this::connectToServer);
        addW(btnX(), b1Y + gap,     "Boutique",           this::openShop);
        addW(btnX(), b1Y + gap * 2, "Options",            this::openOptions);
        addW(btnX(), b1Y + gap * 3, "Quitter",            () -> minecraft.stop());

        for (int i = 0; i < N; i++) spawnP(i, true);
    }

    private int btnX() { return txX + 2; }

    private void addW(int x, int y, String label, Runnable action) {
        addRenderableWidget(new ShinseiButton(x, y, btnMaxW, btnH,
            Component.literal(label), action));
    }

    private void spawnP(int i, boolean anywhere) {
        px[i]    = rng.nextFloat() * width;
        py[i]    = anywhere ? rng.nextFloat() * height : height + rng.nextFloat() * 30 + 5;
        spd[i]   = 0.10f + rng.nextFloat() * 0.42f;
        amp[i]   = 12f   + rng.nextFloat() * 30f;
        phase[i] = rng.nextFloat() * (float)(Math.PI * 2);
        alf[i]   = 0.35f + rng.nextFloat() * 0.65f;
        sz[i]    = 1f    + rng.nextFloat() * 2.5f;
        kind[i]  = rng.nextInt(3);
        int r = rng.nextInt(10);
        hue[i] = r < 4 ? 0 : r < 8 ? 1 : r < 9 ? 2 : 3;
    }

    // ── render ────────────────────────────────────────────────────────────────
    @Override
    public void render(GuiGraphics g, int mx, int my, float delta) {
        long now = System.currentTimeMillis();
        if (lastMs < 0) lastMs = now;
        float dt  = Math.min(0.1f, (now - lastMs) / 1000f);
        lastMs = now;
        fadeIn = Math.min(1f, fadeIn + dt * 2.5f);
        double sec = now / 1000.0;

        int W = width, H = height;

        g.fill(0, 0, W, H, 0xFF000000);
        drawBackground(g, W, H);
        drawAtmosphere(g, W, H);
        tickParticles(dt, sec, W, H);
        drawParticles(g);
        drawText(g, W, H, sec);
        super.render(g, mx, my, delta);

        if (fadeIn < 1f) {
            int a = (int)((1f - easeOut(fadeIn)) * 255);
            g.fill(0, 0, W, H, a << 24);
        }
    }

    // ── Background ────────────────────────────────────────────────────────────
    private void drawBackground(GuiGraphics g, int W, int H) {
        if (bgTex == null || bgNatW <= 0 || bgNatH <= 0) {
            g.fill(0, 0, W, H, 0xFF060610);
            return;
        }
        float scX = (float)W / bgNatW;
        float scY = (float)H / bgNatH;
        float sc  = Math.max(scX, scY);
        int dW = (int)(bgNatW * sc);
        int dH = (int)(bgNatH * sc);
        int ox = (W - dW) / 2;
        int oy = (H - dH) / 2;

        RenderSystem.enableBlend();
        RenderSystem.defaultBlendFunc();
        g.pose().pushPose();
        g.pose().translate(ox, oy, 0);
        g.pose().scale(sc, sc, 1f);
        g.blit(bgTex, 0, 0, 0f, 0f, bgNatW, bgNatH, bgNatW, bgNatH);
        g.pose().popPose();
    }

    // ── Atmospheric gradient ──────────────────────────────────────────────────
    private void drawAtmosphere(GuiGraphics g, int W, int H) {
        int gradStart = (int)(W * 0.42f);
        int gradFull  = (int)(W * 0.65f);
        for (int x = gradStart; x < W; x++) {
            float t = Math.min(1f, (float)(x - gradStart) / Math.max(1, gradFull - gradStart));
            float curve = t * t;
            int a = (int)(165 * curve);
            g.fill(x, 0, x + 1, H, a << 24);
        }
        int darkBase = (int)(H * 0.60f);
        for (int y = darkBase; y < H; y++) {
            float t = (float)(y - darkBase) / (H - darkBase);
            int a = (int)(80 * t * t);
            g.fill(txX, y, W, y + 1, a << 24);
        }
    }

    // ── Particles ─────────────────────────────────────────────────────────────
    private void tickParticles(float dt, double sec, int W, int H) {
        for (int i = 0; i < N; i++) {
            py[i] -= spd[i] * dt * 60f;
            float dSine = (float)(Math.sin(sec * 0.5 + phase[i])
                                - Math.sin((sec - dt) * 0.5 + phase[i])) * amp[i];
            px[i] += dSine;
            if (py[i] < H * 0.25f) alf[i] = Math.max(0f, alf[i] - dt * 1.1f);
            if (px[i] < -20)          px[i] += W + 40;
            else if (px[i] > W + 20)  px[i] -= W + 40;
            if (py[i] < -20 || alf[i] < 0.03f) spawnP(i, false);
        }
    }

    private void drawParticles(GuiGraphics g) {
        for (int i = 0; i < N; i++) {
            int base  = PCOLS[hue[i]];
            int a     = (int)(alf[i] * 200);
            int col   = (a << 24) | base;
            int glowA = (int)(alf[i] * 50);
            int glow  = (glowA << 24) | base;
            int x = (int)px[i], y = (int)py[i];
            int s = Math.max(1, (int)sz[i]);
            switch (kind[i]) {
                case 0 -> {
                    g.fill(x-s,   y,   x+s+1, y+1,   col);
                    g.fill(x,   y-s,   x+1,   y+s+1, col);
                    g.fill(x-s-1,y-1,  x+s+2, y+2,   glow);
                    g.fill(x-1, y-s-1, x+2,   y+s+2, glow);
                }
                case 1 -> {
                    g.fill(x-s-2, y-s-2, x+s+3, y+s+3, glow);
                    g.fill(x-s,   y-s,   x+s+1, y+s+1, col);
                }
                default -> {
                    if (s > 1) g.fill(x-1, y-1, x+s+1, y+s+1, glow);
                    g.fill(x, y, x+s, y+s, col);
                }
            }
        }
    }

    // ── Text ──────────────────────────────────────────────────────────────────
    private void drawText(GuiGraphics g, int W, int H, double sec) {
        int cx = txX + (W - txX) / 2;

        // SHINSEI title
        int titleY = (int)(H * 0.13f);
        String title = "SHINSEI";

        float glow = (float)(Math.sin(sec * 1.6) * 0.5 + 0.5);
        int glA = (int)(18 + 22 * glow);

        // Gradient characters at 2× scale
        g.pose().pushPose();
        g.pose().scale(2f, 2f, 1f);
        int totalW = 0;
        for (int i = 0; i < title.length(); i++)
            totalW += font.width(String.valueOf(title.charAt(i))) + (i < title.length() - 1 ? 1 : 0);
        int cx2 = (cx - totalW) / 2;
        g.fill(cx2 * 2 - 8, titleY - 8, (cx2 + totalW) * 2 + 8, titleY + 20, (glA << 24) | 0x7c3aed);
        int tx2 = cx2;
        for (int i = 0; i < title.length(); i++) {
            float t   = (float)i / Math.max(1, title.length() - 1);
            int   col = lerp(0xFF7c3aed, 0xFF06b6d4, t);
            g.drawString(font, String.valueOf(title.charAt(i)), tx2, titleY / 2, col, true);
            tx2 += font.width(String.valueOf(title.charAt(i))) + 1;
        }
        g.pose().popPose();

        // Tagline
        int tagY = titleY + 24;
        String tag = "S E R V E U R   R P G";
        int tagW = font.width(tag);
        g.drawString(font, tag, cx - tagW / 2, tagY, 0x77c8d8f8, false);

        // Animated separator line
        int lineY = tagY + 14;
        int lineW = (int)((W - txX) * 0.6f);
        float shift = (float)(sec * 0.35 % 1.0);
        for (int x = 0; x < lineW; x++) {
            float f  = ((float)x / lineW + shift) % 1f;
            int   la = (int)(140 * Math.sin(Math.PI * f));
            g.fill(cx - lineW/2 + x, lineY, cx - lineW/2 + x + 1, lineY + 1,
                (la << 24) | 0x7c3aed);
        }

        // Player greeting
        if (!playerName.isEmpty()) {
            int greetY = (int)(H * 0.39f);
            g.fill(txX + 4, greetY + 3, txX + 6, greetY + 5, 0xFF06b6d4);
            g.drawString(font, "  " + playerName, txX + 6, greetY, 0xCC06b6d4, true);
        }

        // Version info
        String ver = "Minecraft 1.21.1  Forge 52";
        int vw = font.width(ver);
        g.drawString(font, ver, W - vw - 16, H - 14, 0x2ac8d8f8, false);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static float easeOut(float t) { return 1f - (1f - t) * (1f - t); }

    static int lerp(int a, int b, float t) {
        int ar = (a>>16)&0xFF, ag = (a>>8)&0xFF, ab = a&0xFF;
        int br = (b>>16)&0xFF, bg = (b>>8)&0xFF, bb = b&0xFF;
        return 0xFF000000
            | ((ar+(int)((br-ar)*t))<<16)
            | ((ag+(int)((bg-ag)*t))<<8)
            |  (ab+(int)((bb-ab)*t));
    }

    @Override public boolean isPauseScreen() { return false; }
    @Override public void onClose() {}

    // ── Button actions ────────────────────────────────────────────────────────
    private void connectToServer() {
        try {
            Class<?> aC = Class.forName("net.minecraft.client.multiplayer.resolver.ServerAddress");
            Class<?> sC = Class.forName("net.minecraft.client.multiplayer.ServerData");
            Class<?> cS = Class.forName("net.minecraft.client.gui.screens.ConnectScreen");
            Object addr = aC.getMethod("parseString", String.class).invoke(null, ShinseiMenuMod.SERVER_IP);
            Object sd;
            try {
                Class<?> te = Class.forName("net.minecraft.client.multiplayer.ServerData$Type");
                Object oth = java.util.Arrays.stream(te.getEnumConstants())
                    .filter(c->c.toString().equals("OTHER")).findFirst().orElse(null);
                sd = oth != null
                    ? sC.getConstructor(String.class,String.class,te).newInstance("SHINSEI",ShinseiMenuMod.SERVER_IP,oth)
                    : sC.getConstructor(String.class,String.class,boolean.class).newInstance("SHINSEI",ShinseiMenuMod.SERVER_IP,false);
            } catch (Exception x) {
                sd = sC.getConstructor(String.class,String.class,boolean.class).newInstance("SHINSEI",ShinseiMenuMod.SERVER_IP,false);
            }
            cS.getMethod("startConnecting",Screen.class,Minecraft.class,aC,sC,boolean.class,Object.class)
              .invoke(null,this,minecraft,addr,sd,false,null);
        } catch (Exception e) {
            try {
                Class<?> mp = Class.forName("net.minecraft.client.gui.screens.multiplayer.JoinMultiplayerScreen");
                minecraft.setScreen((Screen)mp.getConstructor(Screen.class).newInstance(this));
            } catch (Exception ignored) {}
        }
    }

    private void openShop() {
        try { Desktop.getDesktop().browse(new URI(ShinseiMenuMod.SHOP_URL)); } catch (Exception ignored) {}
    }

    private void openOptions() {
        try {
            Class<?> os  = Class.forName("net.minecraft.client.gui.screens.OptionsScreen");
            Class<?> opt = Class.forName("net.minecraft.client.Options");
            minecraft.setScreen((Screen)os.getConstructor(Screen.class,opt).newInstance(this,minecraft.options));
        } catch (Exception ignored) {}
    }
}

// =============================================================================

class ShinseiButton extends AbstractButton {

    private final Runnable action;
    private static final int SPACING = 2;

    ShinseiButton(int x, int y, int w, int h, Component label, Runnable action) {
        super(x, y, w, h, label);
        this.action = action;
    }

    @Override public void onPress() { action.run(); }

    @Override
    public void renderWidget(GuiGraphics g, int mx, int my, float delta) {
        Minecraft mc  = Minecraft.getInstance();
        boolean  hov  = isHovered();
        String   lbl  = getMessage().getString().toUpperCase();
        int      lw   = spacedW(mc, lbl);
        int      tx   = getX();
        int      ty   = getY() + (height - 8) / 2;

        if (hov) {
            g.fill(tx - 6,  ty - 5, tx + lw + 6, ty + 15, 0x0E06b6d4);
            g.fill(tx - 3,  ty - 3, tx + lw + 3, ty + 13, 0x1806b6d4);
        }

        int col = hov ? 0xFF06b6d4 : 0xFFccd6f6;
        drawSpaced(g, mc, lbl, tx, ty, col, true);

        if (hov) {
            g.fill(tx, ty + 11, tx + lw, ty + 12, 0x9906b6d4);
            g.fill(tx - 8, ty + 1, tx - 6, ty + 7, 0xFF7c3aed);
            g.fill(tx - 5, ty + 3, tx - 3, ty + 5, 0xFF06b6d4);
        }
    }

    private static int spacedW(Minecraft mc, String s) {
        int w = 0;
        for (int i = 0; i < s.length(); i++) {
            w += mc.font.width(String.valueOf(s.charAt(i)));
            if (i < s.length() - 1) w += SPACING;
        }
        return w;
    }

    private static void drawSpaced(GuiGraphics g, Minecraft mc, String s,
                                    int x, int y, int color, boolean shadow) {
        int cx = x;
        for (char c : s.toCharArray()) {
            String ch = String.valueOf(c);
            g.drawString(mc.font, ch, cx, y, color, shadow);
            cx += mc.font.width(ch) + SPACING;
        }
    }

    @Override
    public void updateWidgetNarration(NarrationElementOutput out) {
        defaultButtonNarrationText(out);
    }
}
