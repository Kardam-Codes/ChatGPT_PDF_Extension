document.addEventListener("DOMContentLoaded", () => {
  const editor = document.getElementById("editor");
  let previewHTML = document.getElementById("preview").innerHTML;

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
  editor.addEventListener("input", render);

  function render() {
    marked.setOptions({
      breaks: true,     // respects line breaks
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
        hljs.highlightElement(code);   // ⭐ Syntax highlight
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

  const isLight = document.body.classList.contains("light");
  if (isLight) {
    hlTheme.href = "highlight-light.css";
  } else {
    hlTheme.href = "highlight-dark.css";
  }
  // Load saved theme
  chrome.storage.local.get("theme", (data) => {
    if (data.theme === "light") {
      document.body.classList.add("light");
      switchToSun();
      document.getElementById("hlTheme").href = "highlight-light.css";
    }

  });

  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("light");

    const isLight = document.body.classList.contains("light");
    chrome.storage.local.set({ theme: isLight ? "light" : "dark" });

    if (isLight) switchToSun();
    else switchToMoon();
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

  //============ Font size adjustment =============//
  const fontPlus = document.getElementById("fontPlus");
  const fontMinus = document.getElementById("fontMinus");
  const previewEl = document.getElementById("preview");

  let previewFontSize = 1.5;   // default (rem)

  // Load saved size
  chrome.storage.local.get("previewFont", (data) => {
    if (data.previewFont) {
      previewFontSize = data.previewFont;
      applyFontSize();
    }
  });

  function applyFontSize() {
    previewEl.style.fontSize = previewFontSize + "rem";
    chrome.storage.local.set({ previewFont: previewFontSize });
  }

  fontPlus.onclick = () => {
    previewFontSize += 0.1;
    applyFontSize();
  };

  fontMinus.onclick = () => {
    if (previewFontSize > 0.8) {
      previewFontSize -= 0.1;
      applyFontSize();
    }
  };


  // Download PDF logic
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


  // ---------- RESIZE PANELS ----------

  const resizer = document.getElementById("resizer");
  const main = document.querySelector("main");

  if (resizer && main) {
    let isDragging = false;

    resizer.addEventListener("mousedown", (e) => {
      isDragging = true;
      document.body.style.cursor = "col-resize";
      e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const rect = main.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const min = 150;
      const max = rect.width - 150;

      if (offsetX < min || offsetX > max) return;

      main.style.gridTemplateColumns = `${offsetX}px 6px auto`;
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
      document.body.style.cursor = "default";
    });
  } else {
    console.warn("Resizer not found — resize disabled.");
  }
  // ---------- SCROLL SHADOW HANDLING ----------

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
  // const editor = document.getElementById("editor");
  // const preview = document.getElementById("preview");

  if (editorWrap && editor) setupScrollShadows(editorWrap, editor);
  if (previewWrap && preview) setupScrollShadows(previewWrap, preview);

});