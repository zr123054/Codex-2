const analyzeBtn = document.getElementById("analyzeBtn");
const generateBtn = document.getElementById("generateBtn");
const urlInput = document.getElementById("videoUrl");
const qualitySelect = document.getElementById("qualitySelect");
const downloadLink = document.getElementById("downloadLink");
const statusText = document.getElementById("status");
const qualityBox = document.getElementById("qualityBox");
const videoMeta = document.getElementById("videoMeta");
const thumb = document.getElementById("thumb");
const title = document.getElementById("title");

let currentFormats = [];

const setStatus = (text, isError = false) => {
  statusText.textContent = text;
  statusText.style.color = isError ? "#ff6b6b" : "#c9d1d9";
};

analyzeBtn.addEventListener("click", async () => {
  const url = urlInput.value.trim();
  if (!url) {
    setStatus("请先输入 YouTube 链接", true);
    return;
  }

  setStatus("正在解析，请稍候...");
  qualityBox.classList.add("hidden");
  downloadLink.classList.add("hidden");

  try {
    const res = await fetch("/api/formats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "解析失败");
    }

    currentFormats = data.formats;
    qualitySelect.innerHTML = "";
    currentFormats.forEach((fmt) => {
      const option = document.createElement("option");
      option.value = fmt.format_id;
      option.textContent = `${fmt.quality} · ${fmt.ext.toUpperCase()} · ${fmt.size}`;
      qualitySelect.appendChild(option);
    });

    thumb.src = data.thumbnail;
    title.textContent = data.title;
    videoMeta.classList.remove("hidden");
    qualityBox.classList.remove("hidden");
    setStatus(`解析成功，共 ${currentFormats.length} 个可选清晰度`);
  } catch (err) {
    setStatus(err.message, true);
  }
});

generateBtn.addEventListener("click", () => {
  const selectedId = qualitySelect.value;
  const target = currentFormats.find((f) => f.format_id === selectedId);

  if (!target) {
    setStatus("请先解析并选择清晰度", true);
    return;
  }

  downloadLink.href = target.url;
  downloadLink.download = `${title.textContent || "youtube-video"}.${target.ext}`;
  downloadLink.textContent = `下载 ${target.quality} (${target.ext.toUpperCase()})`;
  downloadLink.classList.remove("hidden");
  setStatus("下载连接已生成（链接可能在数小时后失效）");
});
