(() => {
  const SOURCE_EXTENSIONS = [".mp4", ".m3u8", ".webm", ".mov"];

  const normalizeUrl = (raw) => {
    if (!raw || typeof raw !== "string") return "";
    try {
      return new URL(raw, window.location.href).toString();
    } catch {
      return "";
    }
  };

  const inferType = (url) => {
    const lower = url.toLowerCase();
    if (lower.includes(".m3u8") || lower.includes("application/vnd.apple.mpegurl")) return "m3u8";
    if (lower.includes(".mp4")) return "mp4";
    if (lower.includes(".webm")) return "webm";
    if (lower.includes(".mov")) return "mov";
    return "unknown";
  };

  const labelFor = (entry, index) => {
    const source = entry.from ? ` (${entry.from})` : "";
    return `Video ${index + 1}${source}`;
  };

  const collectFromVideoTags = (items) => {
    const videos = document.querySelectorAll("video");

    videos.forEach((video) => {
      const direct = normalizeUrl(video.currentSrc || video.src || "");
      if (direct) {
        items.push({ url: direct, type: inferType(direct), from: "<video>" });
      }

      video.querySelectorAll("source").forEach((source) => {
        const sourceUrl = normalizeUrl(source.src || source.getAttribute("src") || "");
        if (sourceUrl) {
          items.push({
            url: sourceUrl,
            type: inferType(sourceUrl),
            from: "<source>"
          });
        }
      });
    });
  };

  const collectFromLinks = (items) => {
    const selectors = [
      "a[href]",
      "link[href]",
      "script[src]",
      "[data-src]",
      "[data-url]",
      "[src]"
    ];

    const nodes = document.querySelectorAll(selectors.join(","));

    nodes.forEach((node) => {
      const candidates = [
        node.getAttribute("href"),
        node.getAttribute("src"),
        node.getAttribute("data-src"),
        node.getAttribute("data-url")
      ].filter(Boolean);

      candidates.forEach((candidate) => {
        const url = normalizeUrl(candidate);
        if (!url) return;
        const lower = url.toLowerCase();

        if (SOURCE_EXTENSIONS.some((ext) => lower.includes(ext))) {
          items.push({
            url,
            type: inferType(url),
            from: node.tagName.toLowerCase()
          });
        }
      });
    });
  };

  const uniqByUrl = (items) => {
    const seen = new Set();
    const result = [];

    items.forEach((item) => {
      if (!item.url || seen.has(item.url)) return;
      seen.add(item.url);
      result.push(item);
    });

    return result.map((item, index) => ({
      id: `video-${index + 1}`,
      title: labelFor(item, index),
      ...item
    }));
  };

  const scanForVideos = () => {
    const found = [];
    collectFromVideoTags(found);
    collectFromLinks(found);

    return uniqByUrl(found);
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "SCAN_VIDEOS") {
      const videos = scanForVideos();
      sendResponse({ ok: true, videos });
      return true;
    }

    return false;
  });
})();
