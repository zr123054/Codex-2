# YouTube 网页下载链接生成器

一个简洁的网页工具：输入 YouTube 链接，解析可用清晰度，并生成对应清晰度的下载地址。

> 提示：请仅下载你有权保存的内容，并遵守所在地区法律与平台条款。

## 功能

- 输入 YouTube 视频链接
- 自动读取可下载的音视频合并格式
- 按清晰度（如 1080p / 720p）选择
- 一键生成下载链接

## 本地运行

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

打开 `http://localhost:8000`

## 部署到 GitHub（源码）

1. 新建 GitHub 仓库并 push 本项目代码。
2. 可直接通过 GitHub 作为源码托管。

## 在线部署建议（连接 GitHub 仓库）

由于该项目需要后端（`yt-dlp`）解析，不适合纯静态 GitHub Pages。建议将 GitHub 仓库连接到以下任一平台：

- Render
- Railway
- Fly.io

启动命令：

```bash
python app.py
```

环境变量（可选）：

- `PORT`：默认 `8000`
