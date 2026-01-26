const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");

const app = express();
app.use(express.json({ limit: "50mb" }));

app.post("/export", async (req, res) => {
  try {
    const { html, theme } = req.body;

    const finalHTML = `
    <html>
    <head>
    <meta charset="UTF-8">
    <style>
      body {
        margin: 0;
        padding: 1px;
        background: white;
      }
    </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
    `;


    fs.writeFileSync("temp.html", finalHTML);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto("file://" + __dirname + "/temp.html", {
      waitUntil: "networkidle0"
    });

    await page.pdf({
      path: "chat.pdf",
      format: "A4",
      printBackground: true,
      // 🔥 Sleeker margins
      margin: {
        top: "1mm",
        bottom: "1mm",
        left: "1mm",
        right: "1mm"
      },
    
      scale: 1,   // slightly tighter layout
      displayHeaderFooter: false,

      headerTemplate: `
        <div style="
          font-size:10px;
          width:100%;
          text-align:center;
          color:#64748b;
          padding-top:1mm;">
          ChatGPT Export • ${new Date().toLocaleDateString()}
        </div>
      `,  

      footerTemplate: `
        <div style="
          font-size:10px;
          width:100%;
          text-align:center;
          color:#64748b;
          padding-bottom:1mm;">
           <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,  
    });

    await browser.close();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.listen(3000, () => {
  console.log("PDF Server running at http://localhost:3000");
});
