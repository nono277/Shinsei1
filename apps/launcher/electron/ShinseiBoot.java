import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.lang.instrument.ClassFileTransformer;
import java.lang.instrument.Instrumentation;
import java.security.ProtectionDomain;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import javax.imageio.ImageIO;

/**
 * Java Agent — Shinsei Boot Screen
 * Affiche un écran de chargement personnalisé avant que LWJGL s'initialise.
 *
 * Args : imagePath|WxH|playerName|mcVersion
 */
public class ShinseiBoot {

    private static final Color BG_COLOR     = new Color(10, 10, 15);
    private static final Color CYAN_COLOR   = new Color(6, 182, 212);

    private static volatile Window     overlay   = null;
    private static volatile boolean    dismissed = false;
    private static final AtomicInteger progress  = new AtomicInteger(0);

    private static final String[] TIPS = {
        "Explore les donjons pour obtenir les meilleures récompenses.",
        "Les factions se battent pour le contrôle des zones PvP.",
        "Améliore ton équipement chez le forgeron du village central.",
        "Rejoins une guilde pour bénéficier de bonus exclusifs.",
        "Les événements saisonniers offrent des objets rares.",
        "Coordonne-toi avec ta faction pour dominer le classement.",
        "Lis les quêtes attentivement pour ne rien manquer.",
        "Les boss de raid réapparaissent toutes les 6 heures.",
        "Le marché aux enchères se tient chaque vendredi soir.",
        "Les crafts légendaires nécessitent des matériaux de boss.",
    };

    // ── Point d'entrée de l'agent ──────────────────────────────────────────────
    public static void premain(String agentArgs, Instrumentation inst) {
        String[] parts      = (agentArgs != null ? agentArgs : "").split("\\|", -1);
        String   imgPath    = parts.length > 0 && !parts[0].isEmpty() ? parts[0] : resolveDefaultImagePath();
        int[]    dim        = parseResolution(parts.length > 1 ? parts[1] : "");
        String   playerName = parts.length > 2 ? parts[2] : "";
        String   version    = parts.length > 3 ? parts[3] : "1.21.1";

        Thread showThread = new Thread(
            () -> showOverlay(imgPath, dim[0], dim[1], playerName, version),
            "shinsei-overlay"
        );
        showThread.setDaemon(true);
        showThread.start();

        inst.addTransformer(new ClassFileTransformer() {
            private volatile boolean fired = false;

            @Override
            public byte[] transform(ClassLoader loader, String className,
                                    Class<?> redef, ProtectionDomain pd, byte[] bytes) {
                if (!fired && className != null && className.startsWith("org/lwjgl/glfw/GLFW")) {
                    fired = true;
                    inst.removeTransformer(this);
                    schedDismiss(3_500);
                }
                return null;
            }
        });

        schedDismiss(120_000);
    }

    // ── Création de la fenêtre overlay ─────────────────────────────────────────
    private static void showOverlay(String imgPath, int winW, int winH,
                                    String playerName, String version) {
        BufferedImage img = null;
        try {
            File f = new File(imgPath);
            if (f.exists()) img = ImageIO.read(f);
        } catch (Exception ignored) {}

        final BufferedImage bgImage   = img;
        final String        tip       = TIPS[(int)(Math.random() * TIPS.length)];
        final String        pName     = playerName;
        final String        ver       = version;

        Dimension screen = Toolkit.getDefaultToolkit().getScreenSize();
        int x = (screen.width  - winW) / 2;
        int y = (screen.height - winH) / 2;

        Frame ownerFrame = new Frame();
        overlay = new Window(ownerFrame) {
            private Image buffer;

            @Override public void update(Graphics g) { paint(g); }

            @Override
            public void paint(Graphics g) {
                int w = getWidth(), h = getHeight();
                if (w <= 0 || h <= 0) return;
                if (buffer == null
                        || buffer.getWidth(null)  != w
                        || buffer.getHeight(null) != h) {
                    buffer = createImage(w, h);
                }
                if (buffer == null) {
                    renderFrame((Graphics2D) g, w, h, bgImage, tip, pName, ver);
                    return;
                }
                Graphics2D buf = (Graphics2D) buffer.getGraphics();
                renderFrame(buf, w, h, bgImage, tip, pName, ver);
                buf.dispose();
                g.drawImage(buffer, 0, 0, null);
            }
        };

        overlay.setBackground(BG_COLOR);
        overlay.setSize(winW, winH);
        overlay.setLocation(x, y);
        overlay.setAlwaysOnTop(true);
        overlay.setCursor(Cursor.getPredefinedCursor(Cursor.WAIT_CURSOR));
        overlay.setVisible(true);
        overlay.toFront();

        ScheduledExecutorService sched = newDaemonScheduler("shinsei-repaint");
        sched.scheduleAtFixedRate(() -> {
            if (dismissed) { sched.shutdown(); return; }
            if (progress.get() < 95) progress.incrementAndGet();
            Window w = overlay;
            if (w != null) w.repaint();
        }, 0, 300, TimeUnit.MILLISECONDS);
    }

    // ── Rendu ──────────────────────────────────────────────────────────────────
    private static void renderFrame(Graphics2D g2, int w, int h, BufferedImage img,
                                    String tip, String playerName, String version) {
        g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING,
                            RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g2.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                            RenderingHints.VALUE_INTERPOLATION_BILINEAR);

        // Fond + image de chargement
        g2.setColor(BG_COLOR);
        g2.fillRect(0, 0, w, h);
        if (img != null) g2.drawImage(img, 0, 0, w, h, null);

        // Voile dégradé bas → haut pour lisibilité du texte
        for (int i = 0; i < 160; i++) {
            int alpha = (int)(((float) i / 160f) * 210f);
            g2.setColor(new Color(10, 10, 15, alpha));
            g2.fillRect(0, h - 160 + i, w, 1);
        }
        // Voile léger haut (titre)
        for (int i = 0; i < 120; i++) {
            int alpha = (int)(((float)(120 - i) / 120f) * 170f);
            g2.setColor(new Color(10, 10, 15, alpha));
            g2.fillRect(0, i, w, 1);
        }

        // ── Titre SHINSEI ──
        g2.setFont(new Font("Arial", Font.BOLD, 52));
        FontMetrics fm = g2.getFontMetrics();
        String title = "SHINSEI";
        int titleX = (w - fm.stringWidth(title)) / 2;
        int titleY = h / 2 - 10;
        // ombre portée
        g2.setColor(new Color(0, 0, 0, 180));
        g2.drawString(title, titleX + 2, titleY + 2);
        // texte cyan
        g2.setColor(CYAN_COLOR);
        g2.drawString(title, titleX, titleY);

        // ── Sous-titre ──
        g2.setFont(new Font("Arial", Font.PLAIN, 14));
        fm = g2.getFontMetrics();
        String sub = "Serveur RPG Minecraft";
        g2.setColor(new Color(190, 210, 230, 210));
        g2.drawString(sub, (w - fm.stringWidth(sub)) / 2, titleY + 28);

        // ── Astuce ──
        g2.setFont(new Font("Arial", Font.ITALIC, 12));
        fm = g2.getFontMetrics();
        String tipText = "Astuce : " + tip;
        // tronquer si trop large
        while (fm.stringWidth(tipText) > w - 80 && tipText.length() > 20) {
            tipText = tipText.substring(0, tipText.length() - 4) + "...";
        }
        g2.setColor(new Color(140, 200, 220, 200));
        g2.drawString(tipText, (w - fm.stringWidth(tipText)) / 2, h - 70);

        // ── Barre de progression ──
        int barPad  = 40;
        int barY    = h - 48;
        int barH    = 4;
        int barMaxW = w - barPad * 2;
        int fillW   = Math.max(0, (int)(barMaxW * progress.get() / 100.0));

        g2.setColor(new Color(20, 20, 35, 200));
        g2.fillRoundRect(barPad, barY, barMaxW, barH, barH, barH);
        if (fillW > 0) {
            g2.setColor(CYAN_COLOR);
            g2.fillRoundRect(barPad, barY, fillW, barH, barH, barH);
        }

        // ── Label CHARGEMENT ──
        g2.setFont(new Font("Arial", Font.PLAIN, 11));
        fm = g2.getFontMetrics();
        String loadTxt = "CHARGEMENT...";
        g2.setColor(new Color(170, 170, 200));
        g2.drawString(loadTxt, (w - fm.stringWidth(loadTxt)) / 2, barY + barH + 16);

        // ── Coins bas : version (gauche) et joueur (droite) ──
        g2.setFont(new Font("Monospaced", Font.PLAIN, 10));
        fm = g2.getFontMetrics();
        g2.setColor(new Color(90, 90, 120));
        if (!version.isEmpty()) {
            g2.drawString("MC " + version, barPad, h - 8);
        }
        if (!playerName.isEmpty()) {
            g2.drawString(playerName, w - barPad - fm.stringWidth(playerName), h - 8);
        }
    }

    // ── Fermeture ──────────────────────────────────────────────────────────────
    private static void schedDismiss(long delayMs) {
        ScheduledExecutorService s = newDaemonScheduler("shinsei-dismiss");
        s.schedule(() -> { dismiss(); s.shutdown(); }, delayMs, TimeUnit.MILLISECONDS);
    }

    private static void dismiss() {
        synchronized (ShinseiBoot.class) {
            if (dismissed) return;
            dismissed = true;
        }
        progress.set(100);
        Window w = overlay;
        if (w == null) return;
        w.repaint();
        try { Thread.sleep(400); } catch (InterruptedException ignored) {}
        EventQueue.invokeLater(() -> {
            w.setVisible(false);
            w.dispose();
        });
    }

    // ── Utilitaires ────────────────────────────────────────────────────────────
    private static int[] parseResolution(String res) {
        try {
            String[] p = res.split("x", 2);
            int rw = Integer.parseInt(p[0].trim());
            int rh = Integer.parseInt(p[1].trim());
            if (rw > 0 && rh > 0) return new int[]{rw, rh};
        } catch (Exception ignored) {}
        return new int[]{1280, 720};
    }

    private static String resolveDefaultImagePath() {
        String appdata = System.getenv("APPDATA");
        if (appdata == null) appdata = System.getProperty("user.home") + "\\AppData\\Roaming";
        return appdata + "\\.shinsei\\config\\fancymenu\\assets\\loading.png";
    }

    private static ScheduledExecutorService newDaemonScheduler(String name) {
        return Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, name);
            t.setDaemon(true);
            return t;
        });
    }
}
