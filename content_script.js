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

  const triggerDownload = (blob, filename) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
  };

  const parseMapUri = (line) => {
    const match = line.match(/URI="([^"]+)"/i);
    return match?.[1] || "";
  };

  const resolveUrl = (baseUrl, raw) => {
    try {
      return new URL(raw, baseUrl).toString();
    } catch {
      return "";
    }
  };

  const fetchWithRetries = async (url, asText = false) => {
    const errors = [];

    const attempts = [
      () => fetch(url, { credentials: "include", mode: "cors" }),
      () => fetch(url, { credentials: "omit", mode: "cors" }),
      () => fetch(url, { credentials: "include", mode: "same-origin" })
    ];

    for (const attempt of attempts) {
      try {
        const response = await attempt();
        if (!response.ok) {
          errors.push(`HTTP ${response.status}`);
          continue;
        }

        return asText ? response.text() : response.blob();
      } catch (error) {
        errors.push(String(error));
      }
    }

    throw new Error(`Failed to fetch resource. Details: ${errors.join(" | ")}`);
  };

  const fetchArrayBufferWithRetries = async (url) => {
    const blob = await fetchWithRetries(url, false);
    return blob.arrayBuffer();
  };

  const fetchText = async (url) => fetchWithRetries(url, true);

  const parseMediaPlaylist = (playlistText, playlistUrl) => {
    const lines = playlistText.split("\n").map((line) => line.trim()).filter(Boolean);
    const segments = [];
    let initSegment = "";

    for (const line of lines) {
      if (line.startsWith("#EXT-X-MAP:")) {
        const mapUri = parseMapUri(line);
        if (mapUri) initSegment = resolveUrl(playlistUrl, mapUri);
        continue;
      }

      if (!line.startsWith("#")) {
        const segUrl = resolveUrl(playlistUrl, line);
        if (segUrl) segments.push(segUrl);
      }
    }

    return { initSegment, segments };
  };

  const pickVariantFromMaster = (masterText, masterUrl) => {
    const lines = masterText.split("\n").map((line) => line.trim()).filter(Boolean);
    const variants = [];

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.startsWith("#EXT-X-STREAM-INF")) continue;

      const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
      const bandwidth = bwMatch ? Number(bwMatch[1]) : 0;
      const next = lines[i + 1] || "";
      if (next && !next.startsWith("#")) {
        variants.push({ bandwidth, url: resolveUrl(masterUrl, next) });
      }
    }

    variants.sort((a, b) => b.bandwidth - a.bandwidth);
    return variants[0]?.url || "";
  };



  const downloadTsPlaylistAsPseudoMp4 = async (segments, filename) => {
    const binaries = [];

    for (const segmentUrl of segments) {
      binaries.push(await fetchArrayBufferWithRetries(segmentUrl));
    }

    const mergedTsBlob = new Blob(binaries, { type: "video/mp2t" });
    triggerDownload(mergedTsBlob, filename);
  };

  const downloadM3U8AsMp4 = async (m3u8Url, filename) => {
    const firstText = await fetchText(m3u8Url);
    const basePlaylistUrl = firstText.includes("#EXT-X-STREAM-INF")
      ? pickVariantFromMaster(firstText, m3u8Url)
      : m3u8Url;

    if (!basePlaylistUrl) {
      throw new Error("No playable variant found in master playlist.");
    }

    const mediaText = basePlaylistUrl === m3u8Url ? firstText : await fetchText(basePlaylistUrl);
    const { initSegment, segments } = parseMediaPlaylist(mediaText, basePlaylistUrl);

    if (!segments.length) {
      throw new Error("No media segments found in playlist.");
    }

    const fmp4Like = initSegment || segments.some((url) => /\.(m4s|mp4)(\?|$)/i.test(url));
    if (!fmp4Like) {
      await downloadTsPlaylistAsPseudoMp4(segments, filename);
      return;
    }

    const binaries = [];

    if (initSegment) {
      binaries.push(await fetchArrayBufferWithRetries(initSegment));
    }

    for (const segmentUrl of segments) {
      binaries.push(await fetchArrayBufferWithRetries(segmentUrl));
    }

    const mp4Blob = new Blob(binaries, { type: "video/mp4" });
    triggerDownload(mp4Blob, filename);
  };

  const downloadAsMp4 = async (url, type, filename) => {
    if (type === "m3u8") {
      await downloadM3U8AsMp4(url, filename);
      return;
    }

    const mediaBlob = await fetchWithRetries(url, false);
    triggerDownload(mediaBlob, filename);
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "SCAN_VIDEOS") {
      sendResponse({ ok: true, videos: scanForVideos() });
      return true;
    }

    if (message?.type === "DOWNLOAD_AS_MP4" && typeof message.url === "string") {
      const filename = typeof message.filename === "string" && message.filename.trim()
        ? message.filename.trim()
        : `video-${Date.now()}.mp4`;
      const type = typeof message.mediaType === "string" ? message.mediaType : inferType(message.url);

      downloadAsMp4(message.url, type, filename)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({
          ok: false,
          code: "FETCH_FAILED",
          error: String(error)
        }));
      return true;
    }

    return false;
  });
})();
