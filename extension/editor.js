document.addEventListener("DOMContentLoaded", () => {
  const editor = document.getElementById("editor");
  const preview = document.getElementById("preview");
  const emptyState = document.getElementById("emptyState");

  /* =========================================================
     EMPTY STATE
  ========================================================= */

  function updateEmptyState() {
    if (!emptyState) return;
    const empty = editor.value.trim().length === 0;
    emptyState.classList.toggle("visible", empty);
  }

  /* =========================================================
     DEBOUNCE UTILITY
  ========================================================= */

  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /* =========================================================
     LOAD SAVED MARKDOWN
  ========================================================= */

  chrome.storage.local.get("markdown", (data) => {
    editor.value = data.markdown || "";
    render();
    updateEmptyState();
  });

  const saveMarkdown = debounce(() => {
    chrome.storage.local.set({ markdown: editor.value });
  }, 300);

  editor.addEventListener("input", () => {
    render();
    saveMarkdown();
    updateEmptyState();
  });

  /* =========================================================
     MARKDOWN RENDER
  ========================================================= */

  function render() {
    marked.setOptions({
      breaks: true,
      gfm: true
    });

    let html = marked.parse(editor.value);

    // Convert double HR to page break
    html = html.replace(
      /<hr>\s*<hr>/g,
      '<div class="page-break"></div>'
    );

    preview.innerHTML = html;
    enhanceCodeBlocks();
  }

  /* =========================================================
     CODE BLOCK ENHANCEMENT
  ========================================================= */

  function enhanceCodeBlocks() {
    const blocks = preview.querySelectorAll("pre");

    blocks.forEach((pre) => {
      if (pre.parentElement.classList.contains("code-block")) return;

      const code = pre.querySelector("code");
      if (code) {
        hljs.highlightElement(code);
      }

      const wrapper = document.createElement("div");
      wrapper.className = "code-block";

      const header = document.createElement("div");
      header.className = "code-header";

      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.innerText = "Copy";

      btn.onclick = () => {
        navigator.clipboard.writeText(pre.innerText);
        btn.innerText = "Copied!";
        setTimeout(() => (btn.innerText = "Copy"), 1000);
      };

      header.appendChild(btn);
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
    });
  }

  /* =========================================================
     THEME TOGGLE
  ========================================================= */

  const themeBtn = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  const hlTheme = document.getElementById("hlTheme");

  function applySyntaxTheme() {
    const isLight = document.body.classList.contains("light");
    hlTheme.href = isLight ? "highlight-light.css" : "highlight-dark.css";
  }

  chrome.storage.local.get("theme", (data) => {
    if (data.theme === "light") {
      document.body.classList.add("light");
      switchToSun();
    }
    applySyntaxTheme();
  });

  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("light");

    const isLight = document.body.classList.contains("light");
    chrome.storage.local.set({ theme: isLight ? "light" : "dark" });

    isLight ? switchToSun() : switchToMoon();
    applySyntaxTheme();
  });

  function switchToSun() {
    themeIcon.innerHTML = `
      <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
      <line x1="12" y1="1" x2="12" y2="4" stroke="currentColor" stroke-width="2"/>
      <line x1="12" y1="20" x2="12" y2="23" stroke="currentColor" stroke-width="2"/>
    `;
  }

  function switchToMoon() {
    themeIcon.innerHTML = `
      <path fill="currentColor"
        d="M21 12.79A9 9 0 1111.21 3
           7 7 0 0021 12.79z"/>
    `;
  }

  /* =========================================================
     FONT SIZE SYSTEM
  ========================================================= */

  const fontPlus = document.getElementById("fontPlus");
  const fontMinus = document.getElementById("fontMinus");
  const root = document.documentElement;

  let baseFont = 1.5;

  chrome.storage.local.get("previewFont", (data) => {
    if (typeof data.previewFont === "number") {
      baseFont = data.previewFont;
      applyFontScale();
    }
  });

  function applyFontScale() {
    root.style.setProperty("--preview-font", `${baseFont}rem`);
    root.style.setProperty("--h1-scale", `${baseFont * 1.25}rem`);
    root.style.setProperty("--h2-scale", `${baseFont * 1.1}rem`);
    root.style.setProperty("--h3-scale", `${baseFont * 1.0}rem`);
    chrome.storage.local.set({ previewFont: baseFont });
  }

  fontPlus.onclick = () => {
    baseFont = Math.min(baseFont + 0.1, 3);
    applyFontScale();
  };

  fontMinus.onclick = () => {
    baseFont = Math.max(baseFont - 0.1, 0.9);
    applyFontScale();
  };

  applyFontScale();

  /* =========================================================
     DOWNLOAD PDF
  ========================================================= */

  const downloadBtn = document.getElementById("download");

  downloadBtn.onclick = async () => {
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules).map(r => r.cssText).join("");
        } catch {
          return "";
        }
      })
      .join("");

    const payload = {
      html: `<style>${styles}</style><div class="pdf-root">${preview.innerHTML}</div>`,
      theme: document.body.classList.contains("light") ? "light" : "dark"
    };

    try {
      await fetch("http://localhost:3000/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      showToast("PDF generated successfully!");
    } catch {
      showToast("PDF export failed. Is server running?");
    }
  };

  /* =========================================================
     PANEL RESIZE + PERSISTENCE
  ========================================================= */

  const resizer = document.getElementById("resizer");
  const main = document.querySelector("main");

  chrome.storage.local.get("editorWidth", (data) => {
    if (!main || !data.editorWidth) return;

    const rect = main.getBoundingClientRect();
    const width = Math.max(180, Math.min(data.editorWidth, rect.width - 180));
    main.style.gridTemplateColumns = `${width}px 8px auto`;
  });

  if (resizer && main) {
    let isDragging = false;

    resizer.addEventListener("mousedown", (e) => {
      isDragging = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const rect = main.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < 180 || x > rect.width - 180) return;
      main.style.gridTemplateColumns = `${x}px 8px auto`;
    });

    window.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";

      const width = parseInt(main.style.gridTemplateColumns, 10);
      if (!isNaN(width)) chrome.storage.local.set({ editorWidth: width });
    });
  }

  /* =========================================================
     SCROLL SYNC
  ========================================================= */

  let isSyncingScroll = false;

  function syncScroll(source, target) {
    if (isSyncingScroll) return;

    const ratio =
      source.scrollTop /
      (source.scrollHeight - source.clientHeight || 1);

    isSyncingScroll = true;
    target.scrollTop =
      ratio * (target.scrollHeight - target.clientHeight);

    requestAnimationFrame(() => (isSyncingScroll = false));
  }

  editor.addEventListener("scroll", () => syncScroll(editor, preview));
  preview.addEventListener("scroll", () => syncScroll(preview, editor));

});

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => toast.remove(), 2500);
}

