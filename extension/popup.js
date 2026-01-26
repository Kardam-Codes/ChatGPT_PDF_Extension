const input = document.getElementById("input");
const openBtn = document.getElementById("openPreview");

openBtn.onclick = () => {
  const content = input.value.trim();
  if (!content) return alert("Paste something first!");

  chrome.storage.local.set({ markdown: content }, () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("editor.html")
    });
  });
};
