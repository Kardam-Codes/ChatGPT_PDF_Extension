const input = document.getElementById("input");
const openBtn = document.getElementById("openPreview");

openBtn.onclick = () => {
  const content = input.value.trim();
  if (!content) return showToast("Paste something first!");

  chrome.storage.local.set({ markdown: content }, () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("editor.html")
    });
  });
};

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => toast.remove(), 2500);
}

