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

const downloadDirect = (video) => {
  chrome.downloads.download(
    {
      url: video.url,
      filename: `circle-video-${Date.now()}.${video.type === "unknown" ? "mp4" : video.type}`,
      saveAs: true
    },
    () => {
      if (chrome.runtime.lastError) {
        window.open(video.url, "_blank", "noopener,noreferrer");
      }
    }
  );
};

const getFfmpegCommand = (m3u8Url) => `ffmpeg -i "${m3u8Url}" -c copy "output.mp4"`;

const handleBlobDownload = async (tabId, video) => {
  const res = await chrome.tabs.sendMessage(tabId, {
    type: "DOWNLOAD_BLOB",
    url: video.url,
    filename: `circle-video-${Date.now()}.mp4`
  });

  if (!res?.ok) {
    throw new Error(res?.error || "Blob download failed");
  }
};

const renderVideos = async (videos, tabId) => {
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

    const primaryLabel = video.type === "m3u8"
      ? "Copy FFmpeg"
      : video.type === "blob"
        ? "Save Blob"
        : "Download";

    const primaryBtn = createActionButton(primaryLabel, "btn--secondary", async () => {
      try {
        if (video.type === "m3u8") {
          await copyText(getFfmpegCommand(video.url));
          setStatus("FFmpeg command copied. Run it in your terminal to create MP4.");
          return;
        }

        if (video.type === "blob") {
          await handleBlobDownload(tabId, video);
          setStatus("Blob was requested for download as MP4.");
          return;
        }

        downloadDirect(video);
      } catch (error) {
        setStatus(`Action failed: ${String(error)}`, true);
      }
    });

    const copyBtn = createActionButton("Copy URL", "btn--ghost", async () => {
      try {
        await copyText(video.url);
        setStatus("Copied video URL.");
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
    renderVideos(videos, tab.id);
  } catch {
    setStatus("Unable to scan this tab. Open a Circle page and retry.", true);
  }
});
