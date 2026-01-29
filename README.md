# ChatGPT → Perfect PDF

Turn ChatGPT responses into **clean, beautiful, print‑ready PDFs** — with full control over layout, typography, and theme.

This project is a **local-first Chrome Extension + PDF server** designed for people who care about *readability*, *formatting*, and *professional output*.

---

## ✨ Why This Exists

Copy‑pasting ChatGPT content into Word / Google Docs usually breaks:

* Code blocks ❌
* Headings ❌
* Lists ❌
* Page breaks ❌
* Dark/light theme consistency ❌

**ChatGPT → Perfect PDF** solves this by giving you:

* A live Markdown editor
* A ChatGPT‑like preview
* Pixel‑perfect PDF export

All **offline, private, and local**.

---

## 🚀 Features

### 📝 Editor + Live Preview

* Paste ChatGPT responses directly
* Edit Markdown freely
* Instant preview with accurate formatting

### 🎨 Theme & Typography Control

* Dark / Light mode
* Adjustable font size (headings scale proportionally)
* Code blocks remain untouched for clarity

### 💻 Code Blocks (ChatGPT‑style)

* Syntax highlighting (dark & light)
* Copy‑code button
* Clean spacing & borders

### 📄 PDF Export

* True page breaks using `--- ---`
* Minimal margins
* Print‑friendly typography
* Same styling as preview

### 🧠 UX Polish

* Resizable editor / preview panels (with persistence)
* Scroll‑sync between editor and preview
* Empty‑state guidance
* Custom scrollbars

---

## 🗂️ Project Structure

```
ChatGPT_PDF_Extension/
├─ extension/
│  ├─ editor.html
│  ├─ editor.css
│  ├─ editor.js
│  ├─ manifest.json
│  ├─ marked.min.js
│  ├─ highlight.min.js
│  ├─ highlight-dark.css
│  └─ highlight-light.css
│
├─ pdf-server/
│  ├─ server.js
│  ├─ package.json
│  └─ node_modules/ (ignored)
│
├─ .gitignore
└─ README.md
```

---

## 🧩 How It Works

### 1️⃣ Chrome Extension (Frontend)

* Accepts pasted ChatGPT content
* Renders Markdown using `marked`
* Enhances code blocks with `highlight.js`
* Sends rendered HTML to the PDF server

### 2️⃣ Local PDF Server (Backend)

* Receives styled HTML
* Uses headless Chromium (Puppeteer)
* Exports a high‑quality PDF

Nothing is uploaded anywhere. Everything runs locally.

---

## 🛠️ Setup Instructions

### ✅ Requirements

* Node.js (v18+ recommended)
* Google Chrome

---

### 🔹 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/chatgpt-perfect-pdf.git
cd chatgpt-perfect-pdf
```

---

### 🔹 2. Install PDF Server Dependencies

```bash
cd pdf-server
npm install
```

---

### 🔹 3. Start the PDF Server

```bash
node server.js
```

You should see:

```
📄 PDF server running at http://localhost:3000
```

---

### 🔹 4. Load Chrome Extension

1. Open Chrome
2. Go to `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `extension/` folder

---

## 🧪 Usage

1. Open the extension
2. Paste a ChatGPT response
3. Adjust font size / theme if needed
4. Use `--- ---` for page breaks
5. Click **Download PDF**

---

## 🧠 Design Principles

* **Local‑first** → privacy by default
* **Predictable rendering** → what you see is what you print
* **Minimal UI** → content always comes first
* **Extensible architecture** → future features easy to add

---

## 🛣️ Roadmap

### Phase B — PDF Quality

* Headers & footers
* Page numbers
* Cover page support
* Better table handling

### Phase C — Productivity

* Focus mode
* Preview‑only mode
* Export presets

### Phase D — Power Features

* ChatGPT auto‑capture
* Section navigation
* Multi‑document export

---

## 🤝 Contributing

Contributions are welcome!

If you want to:

* Improve UI/UX
* Enhance PDF output
* Add power features

Open an issue or submit a PR.

---

## 📜 License

MIT License — free to use, modify, and distribute.

---

## ⭐ Final Note

This project was built with **care for detail**, not speed.

If you value clean documents, readable code, and professional output — this tool is for you.
