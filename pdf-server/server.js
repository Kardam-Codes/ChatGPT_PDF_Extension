import express from "express";
import puppeteer from "puppeteer";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "md-to-perfect-pdf",
    message: "Use POST /export to generate PDFs"
  });
});

/* =========================================================
   PDF EXPORT ENDPOINT
========================================================= */

app.post("/export", async (req, res) => {
  const { html, options = {} } = req.body;

  if (!html) {
    return res.status(400).json({ error: "No HTML provided" });
  }

  const safeString = (value, fallback) =>
    typeof value === "string" && value.trim() ? value.trim() : fallback;

  const safeBoolean = (value, fallback) =>
    typeof value === "boolean" ? value : fallback;

  const sanitizeFileName = (name) => {
    const base = safeString(name, "chatgpt-export.pdf")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .trim();
    return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
  };

  const theme = safeString(options.theme, "dark");
  const pageSize = safeString(options.pageSize, "A4");
  const orientation = safeString(options.orientation, "portrait");
  const marginPreset = safeString(options.margin, "normal");
  const fontChoice = safeString(options.font, "Inter");
  const headerEnabled = safeBoolean(options.header, false);
  const footerEnabled = safeBoolean(options.footer, true);
  const includeDateTime = safeBoolean(options.includeDateTime, false);
  const pageBreaks = safeString(options.pageBreaks, "auto");
  const fileName = sanitizeFileName(options.fileName);

  let browser;
  try {
    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      puppeteer.executablePath() ||
      "/opt/render/.cache/puppeteer/chrome/linux-144.0.7559.96/chrome-linux64/chrome";

    console.log("Using Chrome executable:", executablePath);

    browser = await puppeteer.launch({
      headless: "new",
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--font-render-hinting=medium"
      ]
    });

    const page = await browser.newPage();

    /* -----------------------------------------------------
       BASE DOCUMENT TEMPLATE
    ----------------------------------------------------- */

    const background = theme === "light" ? "#ffffff" : "#020617";
    const textColor = theme === "light" ? "#020617" : "#e5e7eb";
    const borderColor = theme === "light" ? "#cbd5e1" : "#1e293b";
    const fontFamily = (() => {
      switch (fontChoice.toLowerCase()) {
        case "roboto":
          return `"Roboto", "Segoe UI", Arial, sans-serif`;
        case "serif":
        case "times":
          return `"Times New Roman", Times, serif`;
        default:
          return `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
      }
    })();

    const marginMap = {
      compact: { top: "18mm", bottom: "18mm", left: "12mm", right: "12mm" },
      normal: { top: "30mm", bottom: "26mm", left: "18mm", right: "18mm" },
      spacious: { top: "36mm", bottom: "30mm", left: "22mm", right: "22mm" }
    };

    const pdfMargins = marginMap[marginPreset] || marginMap.normal;

    let htmlToRender = html;
    if (pageBreaks === "none") {
      htmlToRender = htmlToRender.replace(/<div class="page-break"><\/div>/g, "");
    }

    const documentHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    @page {
      margin: 0;
    }

    body {
      margin: 0;
      padding: 0;
      background: ${background};
      color: ${textColor};
      font-family: ${fontFamily};
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* -------- PAGE WRAPPER -------- */
    .pdf-root {
      width: 100%;
      box-sizing: border-box;
    }

    /* -------- PAGE BREAK -------- */
    .page-break {
      page-break-before: always;
    }

    /* -------- CODE BLOCK -------- */
    pre {
      background: ${theme === "light" ? "#f8fafc" : "#0b1220"};
      color: inherit;
      border: 1px solid ${borderColor};
      border-radius: 10px;
      padding: 12px 14px;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.45;
      page-break-inside: avoid;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        "Liberation Mono", monospace;
    }

    /* -------- HEADINGS -------- */
    h1, h2, h3 {
      page-break-after: avoid;
    }

    /* -------- LISTS -------- */
    ul, ol {
      padding-left: 22px;
    }

    li {
      margin: 4px 0;
    }

    /* -------- TABLES -------- */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }

    th, td {
      border: 1px solid ${borderColor};
      padding: 6px 8px;
      text-align: left;
    }

    th {
      background: ${theme === "light" ? "#eef2ff" : "#020617"};
    }
  </style>
</head>

<body>
  <div class="pdf-root">
    ${htmlToRender}
  </div>
</body>
</html>
    `;

    await page.setContent(documentHTML, {
      waitUntil: "networkidle0"
    });

    /* -----------------------------------------------------
       GENERATE PDF
    ----------------------------------------------------- */

    const displayHeaderFooter = headerEnabled || footerEnabled || includeDateTime;
    const nowString = includeDateTime ? new Date().toLocaleString() : "";
    const headerTemplate = headerEnabled || includeDateTime ? `
        <div style="
          font-size:9px;
          width:100%;
          text-align:center;
          color:${textColor};
          padding-top:6px;
        ">
          ${includeDateTime ? nowString : ""}
        </div>
      ` : "<div></div>";

    const footerTemplate = footerEnabled ? `
        <div style="
          font-size:9px;
          width:100%;
          display:flex;
          justify-content:space-between;
          padding:0 18mm;
          color:${textColor};
        ">
          <span>Generated by MD -> Perfect PDF</span>
          <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
        </div>
      ` : "<div></div>";

    const pdfBuffer = await page.pdf({
      format: pageSize,
      landscape: orientation === "landscape",
      printBackground: true,
      displayHeaderFooter,
      headerTemplate,
      footerTemplate,
      margin: pdfMargins
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error("PDF Export Error:", err?.stack || err);

    if (browser) await browser.close();

    res.status(500).json({
      success: false,
      error: err?.message || "PDF generation failed"
    });
  }
});

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {
  console.log(`📄 PDF server running at http://localhost:${PORT}`);
});
