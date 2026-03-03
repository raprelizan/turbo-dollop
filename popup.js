const scanBtn = document.getElementById("scanBtn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");

const setStatus = (text, isError = false) => {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#b42318" : "#6b5b8f";
};

const clearResults = () => {
  resultsEl.innerHTML = "";
};

const copyText = async (value) => {
  await navigator.clipboard.writeText(value);
};

const createActionButton = (text, className, onClick) => {
  const button = document.createElement("button");
  button.className = `btn ${className}`;
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
};

const renderVideos = (videos) => {
  clearResults();

  if (!videos.length) {
    setStatus("No video sources found on this page.");
    return;
  }

  setStatus(`Found ${videos.length} video source(s).`);

  videos.forEach((video) => {
    const li = document.createElement("li");
    li.className = "item";

    const title = document.createElement("p");
    title.className = "item__title";
    title.textContent = `${video.title} • ${video.type.toUpperCase()}`;

    const meta = document.createElement("p");
    meta.className = "item__meta";
    meta.textContent = video.url;

    const actions = document.createElement("div");
    actions.className = "item__actions";

    const isDirectFile = ["mp4", "webm", "mov"].includes(video.type);

    const downloadBtn = createActionButton(
      isDirectFile ? "Download" : "Open Link",
      "btn--secondary",
      () => {
        chrome.downloads.download({
          url: video.url,
          filename: `circle-video-${Date.now()}.${video.type === "unknown" ? "bin" : video.type}`,
          saveAs: true
        }, () => {
          if (chrome.runtime.lastError) {
            window.open(video.url, "_blank", "noopener,noreferrer");
          }
        });
      }
    );

    const copyBtn = createActionButton("Copy URL", "btn--ghost", async () => {
      try {
        await copyText(video.url);
        setStatus("Copied video URL.");
      } catch {
        setStatus("Could not copy URL.", true);
      }
    });

    actions.append(downloadBtn, copyBtn);
    li.append(title, meta, actions);
    resultsEl.appendChild(li);
  });
};

const withActiveTab = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
};

scanBtn.addEventListener("click", async () => {
  try {
    setStatus("Scanning page...");
    clearResults();

    const tab = await withActiveTab();
    if (!tab?.id) {
      setStatus("No active tab found.", true);
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: "SCAN_VIDEOS" });
    const videos = response?.videos || [];

    chrome.storage.local.set({ lastScanResults: videos });
    renderVideos(videos);
  } catch {
    setStatus("Unable to scan this tab. Open a Circle page and retry.", true);
  }
});
