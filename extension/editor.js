document.addEventListener("DOMContentLoaded", () => {
  const editor = document.getElementById("editor");
  const preview = document.getElementById("preview");

  let previewHTML = preview.innerHTML;
  // ---------- DEBOUNCE UTILITY ----------
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /* Convert double HR into page break */
  previewHTML = previewHTML.replace(
    /<hr>\s*<hr>/g,
    '<div class="page-break"></div>'
  );

  // Load pasted content
  chrome.storage.local.get("markdown", (data) => {
    editor.value = data.markdown || "";
    render();
  });

  // Live rendering
  const saveMarkdown = debounce(() => {
    chrome.storage.local.set({ markdown: editor.value });
  }, 300);

  editor.addEventListener("input", () => {
    render();
    saveMarkdown();
  });


  function render() {
    marked.setOptions({
      breaks: true,
      gfm: true
    });

    preview.innerHTML = marked.parse(editor.value);
    enhanceCodeBlocks();
  }

  // Enhance code blocks with copy buttons
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

  //============ Theme toggle logic =============//
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

    if (isLight) switchToSun();
    else switchToMoon();

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

  //============ FONT SIZE SYSTEM (HEADINGS SCALE TOGETHER) =============//

  const fontPlus = document.getElementById("fontPlus");
  const fontMinus = document.getElementById("fontMinus");
  const root = document.documentElement;

  let baseFont = 1.5;   // rem

  chrome.storage.local.get("previewFont", (data) => {
    if (typeof data.previewFont === "number") {
      baseFont = data.previewFont;
      applyFontScale();
    }
  });

  function applyFontScale() {
    root.style.setProperty("--preview-font", `${baseFont}rem`);

    // Headings scale proportionally
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

  //============ DOWNLOAD PDF =============//

  const downloadBtn = document.getElementById("download");

  downloadBtn.onclick = async () => {
    const previewHTML = document.getElementById("preview").innerHTML;

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
      html: `
        <style>${styles}</style>
        <div class="pdf-root">${previewHTML}</div>
      `,
      theme: document.body.classList.contains("light") ? "light" : "dark"
    };

    try {
      await fetch("http://localhost:3000/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      alert("PDF generated successfully!");
    } catch (err) {
      alert("PDF export failed. Is server running?");
    }
  };

  //============ RESIZE PANELS =============//

  const resizer = document.getElementById("resizer");
  const main = document.querySelector("main");
  // ---------- RESTORE PANEL SIZE ----------

  chrome.storage.local.get("editorWidth", (data) => {
    if (!main || !data.editorWidth) return;

    const rect = main.getBoundingClientRect();
    const min = 180;
    const max = rect.width - 180;

    let width = data.editorWidth;
    width = Math.max(min, Math.min(width, max));

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
      const offsetX = e.clientX - rect.left;
      const min = 180;
      const max = rect.width - 180;

      if (offsetX < min || offsetX > max) return;

      main.style.gridTemplateColumns = `${offsetX}px 8px auto`;
    });

    window.addEventListener("mouseup", () => {
      if (!isDragging) return;

      isDragging = false;
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";

      const grid = main.style.gridTemplateColumns;
      const editorWidth = parseInt(grid.split("px")[0], 10);

      if (!isNaN(editorWidth)) {
        chrome.storage.local.set({ editorWidth });
      }
    });

  }

  //============ SCROLL SHADOW HANDLING =============//

  function setupScrollShadows(wrapper, scrollEl) {
    function update() {
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;

      wrapper.classList.toggle("scrolled-top", scrollTop > 4);
      wrapper.classList.toggle(
        "scrolled-bottom",
        scrollTop + clientHeight < scrollHeight - 4
      );
    }

    scrollEl.addEventListener("scroll", update);
    update();
  }

  const editorWrap = document.getElementById("editorWrap");
  const previewWrap = document.getElementById("previewWrap");

  if (editorWrap && editor) setupScrollShadows(editorWrap, editor);
  if (previewWrap && preview) setupScrollShadows(previewWrap, preview);


  // ============ SCROLL SYNC (EDITOR ↔ PREVIEW) ============ //

  let isSyncingScroll = false;

  function syncScroll(source, target) {
    if (isSyncingScroll) return;

    const sourceScrollTop = source.scrollTop;
    const sourceScrollable =
      source.scrollHeight - source.clientHeight;

    const targetScrollable =
      target.scrollHeight - target.clientHeight;

    if (sourceScrollable <= 0 || targetScrollable <= 0) return;

    const scrollRatio = sourceScrollTop / sourceScrollable;

    isSyncingScroll = true;
    target.scrollTop = scrollRatio * targetScrollable;

    // release lock on next frame
    requestAnimationFrame(() => {
      isSyncingScroll = false;
    });
  }

  editor.addEventListener("scroll", () => {
    syncScroll(editor, preview);
  });

  preview.addEventListener("scroll", () => {
    syncScroll(preview, editor);
  });

});
