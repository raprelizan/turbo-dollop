(() => {
  const SOURCE_EXTENSIONS = [".mp4", ".m3u8", ".webm", ".mov"];
  const URL_PATTERN = /(https?:\/\/[^\s"'<>]+|blob:[^\s"'<>]+)/gi;

  const normalizeUrl = (raw) => {
    if (!raw || typeof raw !== "string") return "";
    if (raw.startsWith("blob:")) return raw;

    try {
      return new URL(raw, window.location.href).toString();
    } catch {
      return "";
    }
  };

  const inferType = (url) => {
    const lower = url.toLowerCase();
    if (lower.startsWith("blob:")) return "blob";
    if (lower.includes(".m3u8") || lower.includes("application/vnd.apple.mpegurl")) return "m3u8";
    if (lower.includes(".mp4")) return "mp4";
    if (lower.includes(".webm")) return "webm";
    if (lower.includes(".mov")) return "mov";
    return "unknown";
  };

  const isLikelyVideoUrl = (url) => {
    const lower = url.toLowerCase();
    if (lower.startsWith("blob:")) return true;
    return SOURCE_EXTENSIONS.some((ext) => lower.includes(ext));
  };

  const labelFor = (entry, index) => {
    const source = entry.from ? ` (${entry.from})` : "";
    return `Video ${index + 1}${source}`;
  };

  const pushIfVideo = (items, url, from) => {
    const normalized = normalizeUrl(url);
    if (!normalized || !isLikelyVideoUrl(normalized)) return;

    items.push({
      url: normalized,
      type: inferType(normalized),
      from
    });
  };

  const collectFromVideoTags = (items) => {
    const videos = document.querySelectorAll("video");

    videos.forEach((video) => {
      pushIfVideo(items, video.currentSrc || video.src || "", "<video>");

      video.querySelectorAll("source").forEach((source) => {
        pushIfVideo(items, source.src || source.getAttribute("src") || "", "<source>");
      });
    });
  };

  const collectFromAttributes = (items) => {
    const selectors = [
      "a[href]",
      "link[href]",
      "script[src]",
      "[data-src]",
      "[data-url]",
      "[src]"
    ];

    document.querySelectorAll(selectors.join(",")).forEach((node) => {
      [
        node.getAttribute("href"),
        node.getAttribute("src"),
        node.getAttribute("data-src"),
        node.getAttribute("data-url")
      ].filter(Boolean).forEach((candidate) => {
        pushIfVideo(items, candidate, node.tagName.toLowerCase());
      });
    });
  };

  const collectFromInlineText = (items) => {
    const blocks = document.querySelectorAll("script:not([src]), style, body");

    blocks.forEach((node) => {
      const text = node.textContent || "";
      if (!text) return;

      const matches = text.match(URL_PATTERN) || [];
      matches.forEach((match) => {
        if (isLikelyVideoUrl(match)) {
          pushIfVideo(items, match, `<${node.tagName.toLowerCase()}> text`);
        }
      });
    });
  };

  const uniqByUrl = (items) => {
    const seen = new Set();

    return items
      .filter((item) => {
        if (!item.url || seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      })
      .map((item, index) => ({
        id: `video-${index + 1}`,
        title: labelFor(item, index),
        ...item
      }));
  };

  const scanForVideos = () => {
    const found = [];
    collectFromVideoTags(found);
    collectFromAttributes(found);
    collectFromInlineText(found);
    return uniqByUrl(found);
  };

  const downloadBlobAsMp4 = async (blobUrl, filename) => {
    const response = await fetch(blobUrl);
    const mediaBlob = await response.blob();
    const objectUrl = URL.createObjectURL(mediaBlob);

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "SCAN_VIDEOS") {
      sendResponse({ ok: true, videos: scanForVideos() });
      return true;
    }

    if (message?.type === "DOWNLOAD_BLOB" && typeof message.url === "string") {
      const filename = typeof message.filename === "string" && message.filename.trim()
        ? message.filename.trim()
        : `video-${Date.now()}.mp4`;

      downloadBlobAsMp4(message.url, filename)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: String(error) }));
      return true;
    }

    return false;
  });
})();
