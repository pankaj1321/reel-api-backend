import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/download-reel", async (req, res) => {
  const { url } = req.body;

  if (!url || !url.startsWith("https://www.instagram.com/reel/")) {
    return res.status(400).json({ success: false, error: "Invalid Instagram Reel URL" });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920x1080"
      ]
    });

    const page = await browser.newPage();

    // Fake browser fingerprint
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    );

    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Add short delay to act like human
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.waitForSelector("video", { timeout: 10000 });

    const data = await page.evaluate(() => {
      const video = document.querySelector("video");
      const img = document.querySelector("img");
      return {
        videoUrl: video?.src || "",
        thumbnail: img?.src || "",
      };
    });

    if (data?.videoUrl) {
      res.json({ success: true, ...data });
    } else {
      res.status(500).json({ success: false, error: "Video not found." });
    }
  } catch (err) {
    console.error("❌ Scraping error:", err.message);
    res.status(500).json({ success: false, error: "Scraping failed" });
  } finally {
    if (browser) await browser.close();
  }
});
app.get("/api/test", (req, res) => {
  res.json({ message: "✅ API working perfectly!" });
});


const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
