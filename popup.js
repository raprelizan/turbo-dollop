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

const withActiveTab = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
};

const createActionButton = (text, className, onClick) => {
  const button = document.createElement("button");
  button.className = `btn ${className}`;
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
};

const requestDownloadAsMp4 = async (tabId, video) => {
  const res = await chrome.tabs.sendMessage(tabId, {
    type: "DOWNLOAD_AS_MP4",
    url: video.url,
    mediaType: video.type,
    filename: `video-${Date.now()}.mp4`
  });

  if (!res?.ok) {
    throw new Error(res?.error || "Download as MP4 failed");
  }
};

const renderVideos = (videos, tabId) => {
  clearResults();

  if (!videos.length) {
    setStatus("No MP4/M3U8/Blob sources found on this page.");
    return;
  }

  setStatus(`Found ${videos.length} source(s).`);

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

    const primaryBtn = createActionButton("Download MP4", "btn--secondary", async () => {
      try {
        setStatus("Preparing MP4 download...");
        await requestDownloadAsMp4(tabId, video);
        setStatus("MP4 download started.");
      } catch (error) {
        setStatus(`Download failed: ${String(error)}`, true);
      }
    });

    const copyBtn = createActionButton("Copy URL", "btn--ghost", async () => {
      try {
        await copyText(video.url);
        setStatus("Copied source URL.");
      } catch {
        setStatus("Could not copy URL.", true);
      }
    });

    actions.append(primaryBtn, copyBtn);
    li.append(title, meta, actions);
    resultsEl.appendChild(li);
  });
};

scanBtn.addEventListener("click", async () => {
  try {
    setStatus("Scanning active page...");
    clearResults();

    const tab = await withActiveTab();
    if (!tab?.id) {
      setStatus("No active tab found.", true);
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: "SCAN_VIDEOS" });
    const videos = response?.videos || [];

    chrome.storage.local.set({ lastScanResults: videos });
    renderVideos(videos, tab.id);
  } catch {
    setStatus("Unable to scan this tab. Reload the page and retry.", true);
  }
});
