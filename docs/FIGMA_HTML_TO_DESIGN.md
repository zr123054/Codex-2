# FE25 Test APP Figma 页面导入说明

本项目已生成 `figma-html-to-design.html`，用于通过 Figma 的 html.to.design / HTML to Design 类插件导入页面。

## 尺寸

- 设备目标：iPhone 17 Pro Max
- Figma Frame / CSS Viewport：`440 × 956 px`
- 物理分辨率参考：`1320 × 2868 px`，DPR `3`

## 导入步骤

1. 本地启动静态服务：

   ```bash
   python3 -m http.server 4195 --bind 127.0.0.1
   ```

2. 在浏览器确认页面可访问：

   ```text
   http://127.0.0.1:4195/figma-html-to-design.html
   ```

3. 打开 Figma，运行 html.to.design / HTML to Design 插件。
4. 输入上面的本地 URL 并导入。
5. 导入后按页面名称整理 Frame：启动页、权限申请、首页、固件管理、固件进度、操作完成、采集、导出、文件夹、导出完成、设置、事件标记设置。

## 说明

- `figma-html-to-design.html` 是静态设计交付页面，不参与 App 打包。
- App 运行仍使用 `index.html`、`style.css`、`app.js`。
- 如果后续 UI 有变更，应同步更新 `figma-html-to-design.html` 和 `docs/BACKEND_UI_HANDOFF.md`。
