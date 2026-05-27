import java.awt.*;
import java.awt.geom.*;
import java.awt.image.*;
import java.io.*;
import java.lang.instrument.*;
import java.security.*;
import java.util.Timer;
import java.util.TimerTask;
import javax.imageio.*;
import javax.swing.*;

public class ShinseiBootAgent {

    public static void premain(String agentArgs, Instrumentation inst) {
        String[] a  = agentArgs != null ? agentArgs.split("\\|") : new String[0];
        String img  = a.length > 0 ? a[0] : "";
        String res  = a.length > 1 ? a[1] : "1280x720";
        String user = a.length > 2 ? a[2] : "";
        String ver  = a.length > 3 ? a[3] : "";

        int w = 1280, h = 720;
        try {
            String[] p = res.split("x");
            w = Integer.parseInt(p[0].trim());
            h = Integer.parseInt(p[1].trim());
        } catch (Exception ignored) {}

        System.setProperty("sun.java2d.opengl",  "false");
        System.setProperty("sun.java2d.noddraw", "true");

        final ShinseiBoot boot = new ShinseiBoot(img, user, ver, w, h);
        EventQueue.invokeLater(boot::show);

        // Attendre que TitleScreen soit réellement initialisé (pas juste chargé)
        // avant de fermer → délai pour couvrir la transition Forge → menu principal
        inst.addTransformer(new ClassFileTransformer() {
            private volatile boolean triggered = false;
            @Override
            public byte[] transform(ClassLoader l, String name, Class<?> c,
                                    ProtectionDomain d, byte[] b) {
                if (!triggered && "net/minecraft/client/gui/screens/TitleScreen".equals(name)) {
                    triggered = true;
                    // délai pour couvrir toute la transition Forge + vanilla loading screen
                    new Timer(true).schedule(new TimerTask() {
                        @Override public void run() { EventQueue.invokeLater(boot::finish); }
                    }, 7000L);
                }
                return null;
            }
        });

        new Timer(true).schedule(new TimerTask() {
            @Override public void run() { EventQueue.invokeLater(boot::dispose); }
        }, 180_000L);
    }
}

class ShinseiBoot {
    private final String imgPath, username, version;
    private final int W, H;

    private JFrame  win;
    private JPanel  canvas;

    private volatile float  progress  = 0f;
    private volatile float  clock     = 0f;   // timer général pour toutes les animations
    private volatile float  opacity   = 0f;
    private volatile boolean closing  = false;

    private BufferedImage bg;
    private javax.swing.Timer animTimer;
    private javax.swing.Timer fadeTimer;

    private static final Color VLT    = new Color(124,  58, 237);
    private static final Color CYN    = new Color(  6, 182, 212);
    private static final Color DARK   = new Color( 10,  10,  15);
    private static final Color WHITE  = new Color(255, 255, 255);
    private static final Color BAR_BG = new Color(255, 255, 255, 18);
    private static final Color MUTED  = new Color(200, 200, 220, 160);

    ShinseiBoot(String imgPath, String username, String version, int w, int h) {
        this.imgPath  = imgPath;
        this.username = username;
        this.version  = version;
        this.W = w; this.H = h;
    }

    void show() {
        if (!imgPath.isEmpty()) {
            try { bg = ImageIO.read(new File(imgPath.replace('/', File.separatorChar))); }
            catch (Exception ignored) {}
        }

        canvas = new JPanel() {
            @Override protected void paintComponent(Graphics g) {
                Graphics2D g2 = (Graphics2D) g.create();
                try { render(g2); } finally { g2.dispose(); }
            }
        };
        canvas.setOpaque(true);
        canvas.setBackground(DARK);

        win = new JFrame();
        win.setUndecorated(true);
        win.setType(java.awt.Window.Type.UTILITY); // masqué dans la barre des tâches
        win.setContentPane(canvas);
        win.setSize(W, H);
        win.setAlwaysOnTop(true);
        win.setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);

        GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
        Rectangle b = ge.getDefaultScreenDevice().getDefaultConfiguration().getBounds();
        win.setLocation(b.x + (b.width - W) / 2, b.y + (b.height - H) / 2);

        try { win.setOpacity(0f); } catch (UnsupportedOperationException e) { opacity = 1f; }
        win.setVisible(true);

        animTimer = new javax.swing.Timer(16, e -> tick());
        animTimer.start();
    }

    private void tick() {
        clock += 0.016f;

        if (opacity < 1f) {
            opacity = Math.min(1f, opacity + 0.055f);
            try { win.setOpacity(opacity); } catch (Exception ignored) {}
        }

        if (!closing) {
            if (progress < 0.87f) progress += (0.87f - progress) * 0.007f;
        } else {
            progress += (1f - progress) * 0.09f;
            if (progress >= 0.998f) { animTimer.stop(); beginFade(); return; }
        }
        canvas.repaint();
    }

    private void render(Graphics2D g) {
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,      RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_LCD_HRGB);
        g.setRenderingHint(RenderingHints.KEY_RENDERING,         RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,     RenderingHints.VALUE_INTERPOLATION_BILINEAR);

        // ── Fond ───────────────────────────────────────────────────────────────
        if (bg != null) {
            double ia = (double) bg.getWidth() / bg.getHeight();
            double wa = (double) W / H;
            int dw, dh, dx, dy;
            if (ia > wa) { dh = H; dw = (int)(H * ia); dx = (W-dw)/2; dy = 0; }
            else          { dw = W; dh = (int)(W/ia);  dx = 0; dy = (H-dh)/2; }
            g.drawImage(bg, dx, dy, dw, dh, null);
        } else {
            g.setColor(DARK); g.fillRect(0, 0, W, H);
        }

        // ── Overlays ────────────────────────────────────────────────────────────
        g.setPaint(new GradientPaint(0,0,new Color(0,0,8,210),0,H/3,new Color(0,0,8,30)));
        g.fillRect(0,0,W,H/3);
        g.setColor(new Color(0,0,8,70));
        g.fillRect(0,0,W,H);
        g.setPaint(new GradientPaint(0,H*2/3,new Color(0,0,8,30),0,H,new Color(0,0,8,230)));
        g.fillRect(0,H*2/3,W,H/3+2);

        // ── Zone centrale (panneau semi-opaque) ─────────────────────────────────
        int panW = (int)(W * 0.55f);
        int panH = (int)(H * 0.52f);
        int panX = (W - panW) / 2;
        int panY = (H - panH) / 2 - H/16;
        g.setColor(new Color(8, 8, 18, 160));
        g.fillRoundRect(panX, panY, panW, panH, 24, 24);
        // Bordure subtile violet
        g.setColor(new Color(124, 58, 237, 40));
        g.setStroke(new BasicStroke(1f));
        g.drawRoundRect(panX, panY, panW, panH, 24, 24);

        // ── Titre SHINSEI ────────────────────────────────────────────────────────
        int titleSz = Math.max(42, H / 8);
        Font titleFont = new Font("Segoe UI", Font.BOLD, titleSz);
        g.setFont(titleFont);
        FontMetrics tfm = g.getFontMetrics();
        String title = "SHINSEI";
        int tx = (W - tfm.stringWidth(title)) / 2;
        int ty = panY + panH / 4;

        // Glow
        for (int r = 18; r > 0; r -= 3) {
            int a = (int)(16f * (1f - (float)r/18f));
            g.setColor(new Color(124,58,237,a));
            Font gf = new Font("Segoe UI",Font.BOLD,titleSz+r);
            g.setFont(gf);
            FontMetrics gfm = g.getFontMetrics();
            g.drawString(title,(W-gfm.stringWidth(title))/2,(ty+gfm.getAscent()-tfm.getAscent()));
        }
        g.setFont(titleFont);
        g.setPaint(new GradientPaint(tx,ty,VLT,tx+tfm.stringWidth(title),ty,CYN));
        g.drawString(title,tx,ty);

        // ── Lignes décoratives ──────────────────────────────────────────────────
        int lineY  = ty + H/28;
        int lineW  = panW / 3;
        int leftX  = panX + panW/2 - tfm.stringWidth(title)/2 - lineW - H/40;
        int rightX = panX + panW/2 + tfm.stringWidth(title)/2 + H/40;
        // Gauche : cyan → transparent
        g.setPaint(new GradientPaint(leftX,lineY,new Color(6,182,212,150),leftX+lineW,lineY,new Color(6,182,212,0)));
        g.fillRect(leftX, lineY, lineW, 1);
        // Droite : transparent → violet
        g.setPaint(new GradientPaint(rightX,lineY,new Color(124,58,237,0),rightX+lineW,lineY,new Color(124,58,237,150)));
        g.fillRect(rightX, lineY, lineW, 1);

        // ── Segments de chargement animés ────────────────────────────────────────
        int segs   = 12;
        int segH   = H / 55;
        int segW   = segH * 2;
        int segGap = segH / 2;
        int totalW = segs * segW + (segs - 1) * segGap;
        int segsX  = (W - totalW) / 2;
        int segsY  = panY + panH / 2 - segH / 2;

        for (int i = 0; i < segs; i++) {
            // Chaque segment s'allume en séquence puis clignote
            float phase = (clock * 2.5f - i * 0.18f) % (float)(Math.PI * 2);
            float bright = (float)(0.4 + 0.6 * Math.max(0, Math.sin(phase)));
            int sx = segsX + i * (segW + segGap);
            // Couleur interpolée violet → cyan selon la position
            float t = (float) i / (segs - 1);
            int cr = (int)(VLT.getRed()   + t*(CYN.getRed()   - VLT.getRed()));
            int cg = (int)(VLT.getGreen() + t*(CYN.getGreen() - VLT.getGreen()));
            int cb = (int)(VLT.getBlue()  + t*(CYN.getBlue()  - VLT.getBlue()));
            Color segColor = new Color(cr, cg, cb, (int)(255 * bright));
            g.setColor(segColor);
            g.fillRoundRect(sx, segsY, segW, segH, 4, 4);
            // Lueur sous le segment
            if (bright > 0.5f) {
                g.setColor(new Color(cr, cg, cb, (int)(60 * bright)));
                g.fillRoundRect(sx - 1, segsY + segH, segW + 2, segH / 2, 2, 2);
            }
        }

        // ── Texte statut ─────────────────────────────────────────────────────────
        Font statusFont = new Font("Segoe UI", Font.BOLD, H / 38);
        g.setFont(statusFont);
        FontMetrics sfm = g.getFontMetrics();
        String status = "SERVEUR EN LIGNE";
        g.setColor(new Color(0,0,0,100));
        g.drawString(status,(W-sfm.stringWidth(status))/2+1,segsY+segH+H/18+1);
        g.setColor(new Color(255,255,255,200));
        g.drawString(status,(W-sfm.stringWidth(status))/2,segsY+segH+H/18);

        // ── Barre de progression ─────────────────────────────────────────────────
        int barH  = 5;
        int barY  = panY + panH - H/10;
        int pad   = panX + panW/10;
        int barW  = panW - panW/5;
        int fill  = (int)(barW * progress);

        g.setColor(BAR_BG);
        g.fillRoundRect(pad,barY,barW,barH,barH,barH);

        if (fill > 0) {
            Shape clip = new RoundRectangle2D.Float(pad,barY,fill,barH,barH,barH);
            g.setClip(clip);
            g.setPaint(new GradientPaint(pad,barY,VLT,pad+barW,barY,CYN));
            g.fillRect(pad,barY,fill,barH);
            // Shimmer
            float shimX = (clock * 180f) % (barW + 60) - 30;
            int sx = pad + (int) shimX;
            if (sx > pad-40 && sx < pad+fill+40) {
                g.setPaint(new GradientPaint(sx-20,barY,new Color(255,255,255,0),sx,barY,new Color(255,255,255,100)));
                g.fillRect(sx-20,barY,20,barH);
                g.setPaint(new GradientPaint(sx,barY,new Color(255,255,255,100),sx+20,barY,new Color(255,255,255,0)));
                g.fillRect(sx,barY,20,barH);
            }
            g.setClip(null);
            // Lueur
            g.setPaint(new GradientPaint(pad,barY+barH,new Color(124,58,237,40),pad+fill,barY+barH,new Color(6,182,212,40)));
            g.fillRect(pad,barY+barH,fill,6);
        }

        // ── Pourcentage ──────────────────────────────────────────────────────────
        Font pctFont = new Font("Segoe UI", Font.PLAIN, H / 46);
        g.setFont(pctFont);
        FontMetrics pfm = g.getFontMetrics();
        String pct = (int)(progress*100)+"%";
        g.setColor(new Color(255,255,255,130));
        g.drawString(pct,(W-pfm.stringWidth(pct))/2,barY-8);

        // ── Joueur ───────────────────────────────────────────────────────────────
        if (username != null && !username.isEmpty()) {
            g.setFont(pctFont);
            g.setColor(MUTED);
            g.drawString(username, pad, barY - 8);
        }
    }

    void finish() {
        if (!closing) {
            closing = true;
            // Signale à Electron : l'overlay se ferme → montrer la fenêtre du jeu
            if (!imgPath.isEmpty()) {
                try {
                    String dir = new File(imgPath.replace('/', File.separatorChar)).getParent();
                    new File(dir, "shinsei-ready.flag").createNewFile();
                } catch (Exception ignored) {}
            }
        }
    }

    private void beginFade() {
        fadeTimer = new javax.swing.Timer(16, null);
        fadeTimer.addActionListener(e -> {
            opacity -= 0.045f;
            if (opacity <= 0f) { opacity = 0f; fadeTimer.stop(); dispose(); return; }
            try { win.setOpacity(opacity); } catch (Exception ignored) {}
        });
        fadeTimer.start();
    }

    void dispose() {
        if (animTimer != null) animTimer.stop();
        if (fadeTimer != null) fadeTimer.stop();
        if (win != null) { win.setVisible(false); win.dispose(); }
    }
}
