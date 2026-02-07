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

    let html = "";

    try {
      html = marked.parse(editor.value);
    } catch {
      showToast("Preview render failed", "error");
    }


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
  const exportModal = document.getElementById("exportModal");
  const exportClose = document.getElementById("exportClose");
  const exportCancel = document.getElementById("exportCancel");
  const exportConfirm = document.getElementById("exportConfirm");
  const exportBackdrop = exportModal?.querySelector(".modal-backdrop");

  function openModal() {
    if (!exportModal) return;
    exportModal.classList.add("open");
    exportModal.setAttribute("aria-hidden", "false");
    chrome.storage.local.get("exportOptions", (data) => {
      if (data?.exportOptions) applySettings(data.exportOptions);
    });
  }

  function closeModal() {
    if (!exportModal) return;
    exportModal.classList.remove("open");
    exportModal.classList.remove("exporting");
    exportModal.setAttribute("aria-hidden", "true");
  }

  function getSelectedValue(name) {
    const input = document.querySelector(`input[name="${name}"]:checked`);
    return input ? input.value : null;
  }

  function collectOptions() {
    const themeChoice = getSelectedValue("theme");
    const matchTheme = document.body.classList.contains("light") ? "light" : "dark";

    return {
      pageSize: getSelectedValue("pageSize") || "A4",
      orientation: getSelectedValue("orientation") || "portrait",
      margin: document.getElementById("margin")?.value || "normal",
      theme: themeChoice === "match" ? matchTheme : (themeChoice || matchTheme),
      font: document.getElementById("fontFamily")?.value || "Inter",
      header: document.getElementById("includeTitle")?.checked || false,
      footer: document.getElementById("includePageNumbers")?.checked || false,
      includeDateTime: document.getElementById("includeDateTime")?.checked || false,
      pageBreaks: document.getElementById("pageBreaks")?.value || "auto",
      fileName: document.getElementById("fileName")?.value || "chatgpt-export.pdf",
      autoOpen: document.getElementById("autoOpen")?.checked || false,
      copyPath: document.getElementById("copyPath")?.checked || false,
      rememberSettings: document.getElementById("rememberSettings")?.checked || false
    };
  }

  function applySettings(options) {
    if (!options) return;
    const setRadio = (name, value) => {
      const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
      if (input) input.checked = true;
    };

    setRadio("pageSize", options.pageSize || "A4");
    setRadio("orientation", options.orientation || "portrait");
    setRadio("theme", options.theme === "light" || options.theme === "dark" ? options.theme : "match");

    const margin = document.getElementById("margin");
    if (margin && options.margin) margin.value = options.margin;

    const font = document.getElementById("fontFamily");
    if (font && options.font) font.value = options.font;

    const includeTitle = document.getElementById("includeTitle");
    if (includeTitle && typeof options.header === "boolean") includeTitle.checked = options.header;

    const includePageNumbers = document.getElementById("includePageNumbers");
    if (includePageNumbers && typeof options.footer === "boolean") includePageNumbers.checked = options.footer;

    const includeDateTime = document.getElementById("includeDateTime");
    if (includeDateTime && typeof options.includeDateTime === "boolean") includeDateTime.checked = options.includeDateTime;

    const pageBreaks = document.getElementById("pageBreaks");
    if (pageBreaks && options.pageBreaks) pageBreaks.value = options.pageBreaks;

    const fileName = document.getElementById("fileName");
    if (fileName && options.fileName) fileName.value = options.fileName;

    const autoOpen = document.getElementById("autoOpen");
    if (autoOpen && typeof options.autoOpen === "boolean") autoOpen.checked = options.autoOpen;

    const copyPath = document.getElementById("copyPath");
    if (copyPath && typeof options.copyPath === "boolean") copyPath.checked = options.copyPath;

    const remember = document.getElementById("rememberSettings");
    if (remember && typeof options.rememberSettings === "boolean") remember.checked = options.rememberSettings;
  }

  function persistSettings(options) {
    if (!options?.rememberSettings) return;
    chrome.storage.local.set({ exportOptions: options });
  }

  function setExporting(isExporting) {
    if (!exportModal) return;
    exportModal.classList.toggle("exporting", isExporting);
  }

  async function doExport() {
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules).map(r => r.cssText).join("");
        } catch {
          return "";
        }
      })
      .join("");

    const options = collectOptions();
    persistSettings(options);

    const payload = {
      html: `<style>${styles}</style><div class="pdf-root">${preview.innerHTML}</div>`,
      options
    };

    const progressToast = showToast("Generating PDF...", "info", {
      autoDismissMs: false,
      loaderDurationMs: 2500
    });

    setExporting(true);

    try {
      const response = await fetch("http://localhost:3000/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("application/pdf")) {
        let errorMessage = "PDF export failed. Is server running?";
        try {
          const data = await response.json();
          if (data?.error) errorMessage = data.error;
        } catch {
          const text = await response.text();
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/i);
      const downloadName = match?.[1] || options.fileName || "chatgpt-export.pdf";
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      if (progressToast) progressToast.remove();
      showToast("PDF generated successfully!", "success");
      closeModal();
    } catch (err) {
      if (progressToast) progressToast.remove();
      showToast(err?.message || "PDF export failed. Is server running?", "error");
    } finally {
      setExporting(false);
    }
  }

  downloadBtn.onclick = () => {
    if (!editor.value.trim()) {
      showToast("Paste something first!", "error");
      return;
    }
    openModal();
  };

  exportClose?.addEventListener("click", closeModal);
  exportCancel?.addEventListener("click", closeModal);
  exportBackdrop?.addEventListener("click", closeModal);
  exportConfirm?.addEventListener("click", doExport);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && exportModal?.classList.contains("open")) {
      closeModal();
    }
  });

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

function showToast(message, type = "success", options = {}) {
  const container = document.getElementById("toastContainer");

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const content = document.createElement("div");
  content.className = "toast-content";

  const text = document.createElement("span");
  text.className = "toast-text";
  text.textContent = message;

  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Dismiss notification");
  closeBtn.innerHTML = "&times;";

  content.appendChild(text);
  content.appendChild(closeBtn);
  toast.appendChild(content);

  const loader = document.createElement("div");
  loader.className = "toast-loader";
  if (options.loader === false) {
    loader.classList.add("hidden");
  }
  if (typeof options.loaderDurationMs === "number") {
    loader.style.setProperty("--toast-loader-duration", `${options.loaderDurationMs}ms`);
  }
  toast.appendChild(loader);

  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));
  if (!loader.classList.contains("hidden")) {
    requestAnimationFrame(() => loader.classList.add("fill"));
  }

  const autoDismissMs = options.autoDismissMs ?? 2500;
  let timer = null;
  if (autoDismissMs !== false) {
    timer = setTimeout(() => toast.remove(), autoDismissMs);
  }

  closeBtn.addEventListener("click", () => {
    if (timer) clearTimeout(timer);
    toast.remove();
  });

  return toast;
}

const editor = document.getElementById("editor");
const emptyState = document.getElementById("emptyState");

function updateEmptyState() {
  const isEmpty = editor.value.trim() === "";
  emptyState.classList.toggle("visible", isEmpty);
}

editor.addEventListener("input", updateEmptyState);
updateEmptyState();


