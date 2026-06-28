import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Real API Proxy route for KBS streams to bypass CORS restrictions
  app.get("/api/kbs/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const targetUrl = `https://cfpwwwapi.kbs.co.kr/api/v1/landing/live/channel_code/${code}`;
      
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://onair.kbs.co.kr/",
          "Accept": "application/json"
        }
      });
      
      if (!response.ok) {
        throw new Error(`KBS Endpoint responded with status ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("KBS Live Stream Proxy Error:", error);
      res.status(500).json({ error: error.message || "Failed parsing KBS stream configuration" });
    }
  });

  // Serve Frontend assets using dynamic Vite dev server vs static build
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`oburiG TV full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
