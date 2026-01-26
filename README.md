
```md
# 🚀 ChatGPT → Perfect PDF

A personal Chrome Extension that converts ChatGPT responses into **beautiful, pixel-perfect PDFs** while preserving:

✅ Formatting  
✅ Code blocks  
✅ Syntax highlighting  
✅ Light / Dark themes  
✅ Font scaling  
✅ Page headers / footers  

---

## ✨ Features

- 📄 Live Markdown preview
- 🎨 Syntax highlighted code blocks
- 🌗 Light / Dark theme toggle
- 🔍 Adjustable preview font size
- 📐 Resizable editor & preview panels
- 🖨️ High quality PDF export using Puppeteer
- 📑 Page headers and page numbers

---

````
## 🧱 Project Structure

    chatgpt-perfect-pdf/
    ├── extension/ → Chrome Extension source
    |
    ├── pdf-server/ → Local PDF rendering server
    |
    ├── README.md
    |
    └── .gitignore

````

---

## ⚙️ Setup Instructions

### 1️⃣ Install PDF Server

```bash
cd pdf-server
npm install
node server.js
````

Server runs at:

```
http://localhost:3000
```

---

### 2️⃣ Load Chrome Extension

1. Open Chrome
2. Go to:

```
chrome://extensions
```

3. Enable **Developer Mode**
4. Click **Load unpacked**
5. Select the `/extension` folder

---

---

## 🧪 Usage

1. Copy ChatGPT response
2. Open extension popup
3. Paste content
4. Click **Preview**
5. Adjust font size / theme
6. Click **Download PDF**
7. PDF appears in `/pdf-server/chat.pdf`

---

---

## 🛠️ Tech Stack

* Chrome Extensions (Manifest v3)
* Vanilla JavaScript
* Marked (Markdown parsing)
* Highlight.js (Syntax highlighting)
* Node.js
* Express
* Puppeteer

---

## 📌 Status

Personal local project.
Not intended for public store distribution (yet).

---

## 🙌 Author

---

````
Built by: Kardam Patel
````

