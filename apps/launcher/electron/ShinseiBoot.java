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
 * Affiche un écran de chargement personnalisé par-dessus la fenêtre Minecraft
 * jusqu'à ce que LWJGL (GLFW) soit initialisé.
 *
 * Usage : -javaagent:/path/to/shinsei-boot.jar
 *   ou  : -javaagent:/path/to/shinsei-boot.jar=/chemin/image.png
 */
public class ShinseiBoot {

    private static final Color BG_COLOR   = new Color(10, 10, 15);
    private static final Color CYAN_COLOR = new Color(0, 255, 255);

    private static volatile Window        overlay   = null;
    private static volatile boolean       dismissed = false;
    private static final AtomicInteger    progress  = new AtomicInteger(0);

    // ── Premain : point d'entrée de l'agent ────────────────────────────────────
    public static void premain(String agentArgs, Instrumentation inst) {
        final String imgPath = resolveImagePath(agentArgs);

        // Démarrage de l'overlay dans un thread daemon
        Thread showThread = new Thread(() -> showOverlay(imgPath), "shinsei-overlay");
        showThread.setDaemon(true);
        showThread.start();

        // Détecter le chargement de GLFW → fenêtre LWJGL imminente
        inst.addTransformer(new ClassFileTransformer() {
            private volatile boolean fired = false;

            @Override
            public byte[] transform(ClassLoader loader, String className,
                                    Class<?> redef, ProtectionDomain pd,
                                    byte[] bytes) {
                if (!fired && className != null
                        && className.startsWith("org/lwjgl/glfw/GLFW")) {
                    fired = true;
                    inst.removeTransformer(this);
                    // Attendre 3,5 s pour laisser la fenêtre native apparaître
                    // et Drippy Loading Screen prendre le relais
                    schedDismiss(3_500);
                }
                return null; // pas de transformation bytecode
            }
        });

        // Fallback : fermer au bout de 120 s dans tous les cas
        schedDismiss(120_000);
    }

    // ── Création et affichage de l'overlay ─────────────────────────────────────
    private static void showOverlay(String imgPath) {
        BufferedImage img = null;
        try {
            File f = new File(imgPath);
            if (f.exists()) img = ImageIO.read(f);
        } catch (Exception ignored) {}

        final BufferedImage bgImage = img;

        Rectangle screen = GraphicsEnvironment
            .getLocalGraphicsEnvironment()
            .getDefaultScreenDevice()
            .getDefaultConfiguration()
            .getBounds();

        // Window AWT avec double-buffering manuel (évite Swing + LAF init)
        Frame ownerFrame = new Frame();
        overlay = new Window(ownerFrame) {
            private Image buffer;

            @Override
            public void update(Graphics g) { paint(g); }

            @Override
            public void paint(Graphics g) {
                int w = getWidth(), h = getHeight();
                if (w <= 0 || h <= 0) return;
                if (buffer == null
                        || buffer.getWidth(null) != w
                        || buffer.getHeight(null) != h) {
                    buffer = createImage(w, h);
                }
                if (buffer == null) { renderDirect((Graphics2D) g, w, h, bgImage); return; }
                Graphics2D bg = (Graphics2D) buffer.getGraphics();
                renderDirect(bg, w, h, bgImage);
                bg.dispose();
                g.drawImage(buffer, 0, 0, null);
            }
        };

        overlay.setBackground(BG_COLOR);
        overlay.setSize(screen.width, screen.height);
        overlay.setLocation(screen.x, screen.y);
        overlay.setAlwaysOnTop(true);
        overlay.setCursor(Cursor.getPredefinedCursor(Cursor.WAIT_CURSOR));
        overlay.setVisible(true);
        overlay.toFront();

        // Boucle repaint + avancement de la barre (300 ms/tick → 95 % en ~28 s)
        ScheduledExecutorService sched = newDaemonScheduler("shinsei-repaint");
        sched.scheduleAtFixedRate(() -> {
            if (dismissed) { sched.shutdown(); return; }
            if (progress.get() < 95) progress.incrementAndGet();
            Window w = overlay;
            if (w != null) w.repaint();
        }, 0, 300, TimeUnit.MILLISECONDS);
    }

    // ── Rendu ──────────────────────────────────────────────────────────────────
    private static void renderDirect(Graphics2D g2, int w, int h, BufferedImage img) {
        g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING,
                            RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g2.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                            RenderingHints.VALUE_INTERPOLATION_BILINEAR);

        // Fond #0a0a0f
        g2.setColor(BG_COLOR);
        g2.fillRect(0, 0, w, h);

        // Image plein écran
        if (img != null) g2.drawImage(img, 0, 0, w, h, null);

        // Barre de progression cyan, 4 px, plein largeur, 26 px du bas
        int barY = h - 26;
        int barW = Math.max(0, (int)(w * progress.get() / 100.0));

        g2.setColor(new Color(10, 10, 15, 160));
        g2.fillRect(0, barY, w, 4);
        g2.setColor(CYAN_COLOR);
        g2.fillRect(0, barY, barW, 4);

        // Texte "CHARGEMENT..." centré, blanc, sous la barre
        g2.setColor(Color.WHITE);
        g2.setFont(new Font("Arial", Font.PLAIN, 13));
        FontMetrics fm = g2.getFontMetrics();
        String txt = "CHARGEMENT...";
        g2.drawString(txt, (w - fm.stringWidth(txt)) / 2, barY + 18);
    }

    // ── Fermeture différée ─────────────────────────────────────────────────────
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
    private static String resolveImagePath(String agentArgs) {
        if (agentArgs != null && !agentArgs.isEmpty()) return agentArgs;
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
