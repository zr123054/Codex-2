# FE25 Test APP 前端工程交付说明

本文档面向前端工程师，说明如何把当前离线 UI 与前端交互基线演进为可接入真实 FE25 产品、真实设备和真实后端的 App。当前代码已完成主要页面、状态和交互闭环；真实接入阶段重点是拆分模块、接入 API / 原生能力、完善错误处理和测试。

## 1. 当前实现概览

| 文件 | 职责 |
| --- | --- |
| `index.html` | 应用入口，提供手机容器、状态栏、弹窗挂载点和 Toast 挂载点 |
| `style.css` | 全部离线样式，包含布局、卡片、按钮、Tab、弹窗、滚动、进度条 |
| `app.js` | 当前 SPA 主逻辑，包含本地状态、路由、页面渲染、交互处理 |
| `main.js` | Electron 主进程，创建独立窗口并加载本地页面 |
| `BACKEND_DEVELOPMENT.md` | 后端接口、数据模型、异步任务和联调验收资料 |

## 2. 真实 App 推荐架构

当前 `app.js` 是便于评审和联调的单文件 SPA。进入真实开发阶段建议拆成以下结构：

```text
src/
├── main.js                 # 前端入口
├── router.js               # 页面路由和导航守卫
├── state/
│   ├── appState.js         # 全局状态
│   ├── deviceStore.js      # 设备状态
│   ├── collectionStore.js  # 采集状态
│   ├── firmwareStore.js    # 固件任务状态
│   ├── exportStore.js      # 文件和导出状态
│   └── settingsStore.js    # 设置状态
├── api/
│   ├── client.js           # fetch 封装、超时、错误码处理
│   ├── devices.js
│   ├── collections.js
│   ├── firmware.js
│   ├── exports.js
│   └── settings.js
├── native/
│   ├── permissions.js      # 蓝牙 / 存储权限桥接
│   ├── bluetooth.js        # 真实蓝牙扫描、连接、断开
│   ├── fileSystem.js       # 文件路径、导出保存、分享
│   └── updater.js          # 固件传输能力或 SDK 适配
├── views/                  # 页面组件
├── components/             # Button、Modal、Toast、Progress、ListRow 等
└── utils/                  # 时间、版本比较、格式化、校验
```

如果继续使用纯 HTML/CSS/JS，也应按模块拆分；如果切换到 Vue / React / Flutter / React Native，应保持同样的业务分层。

## 3. 状态模型

真实接入后建议保留当前全局状态概念，并将状态来源切换为真实接口或原生 SDK。

```ts
type AppState = {
  permissions: {
    bluetooth: boolean;
    storage: boolean;
  };
  activeTab: 'home' | 'export' | 'settings';
  currentDeviceId?: string;
  devices: Device[];
  activeCollection?: CollectionSession;
  firmwareJob?: FirmwareJob;
  exportJob?: ExportJob;
  settings: AppSettings;
};
```

关键规则：

- 蓝牙权限缺失：设备扫描、连接、断开、固件、采集入口禁用。
- 存储权限缺失：导出、文件删除、存储路径调整、清理缓存入口禁用。
- 采集中：不允许清理缓存；停止采集必须二次确认。
- 固件任务运行中：进度页不提供返回；完成后更新设备固件版本。
- 导出任务运行中：可后台导出；完成后进入导出完成页或提示用户。

## 4. API 客户端封装要求

建议新增统一 `api/client.js`：

```js
const API_BASE_URL = window.FE25_CONFIG?.apiBaseUrl || 'http://127.0.0.1:8080';

export async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      signal: controller.signal
    });
    const payload = await response.json();
    if (!response.ok || payload.code !== 0) {
      throw normalizeApiError(payload, response.status);
    }
    return payload.data;
  } finally {
    clearTimeout(timeout);
  }
}
```

错误处理要求：

- 后端错误码统一转成前端 Toast 文案。
- 网络断开、超时、设备断连需要使用可理解中文提示。
- 高风险操作失败时不得直接改变本地 UI 状态，必须以服务端结果为准。

## 5. 原生能力接入

### 5.1 权限

真实 App 需要桥接系统权限：

- 蓝牙权限：扫描、连接、固件、采集前必须确认。
- 存储权限：导出、保存文件、分享前必须确认。
- 手动分别开启两个权限后，若都已开启，应自动进入首页。

### 5.2 蓝牙 / 设备 SDK

建议封装 `native/bluetooth.js`：

```ts
scanDevices(timeoutSeconds): Promise<Device[]>;
connectDevice(deviceId): Promise<Device>;
disconnectDevice(deviceId): Promise<Device>;
subscribeTelemetry(deviceId, callback): Unsubscribe;
```

注意：

- 可连接设备点击卡片空白处不得进入详情，只能点击连接。
- 设备断开后，如果当前处于采集或固件任务，需要给出明确失败或中断状态。

### 5.3 固件传输

固件传输可能由后端任务、设备 SDK 或本地文件流完成。前端只依赖统一任务状态：

```ts
createFirmwareJob(deviceId, targetVersion): Promise<FirmwareJob>;
watchFirmwareJob(jobId, onProgress): Unsubscribe;
```

UI 规则：

- 高版本：标题“固件升级”。
- 低版本：标题“固件回退”。
- 进度页和完成页都不显示左上角返回。
- 失败时展示失败弹窗，提供“返回固件管理”或“重试”。

### 5.4 文件与分享

文件导出建议由后端生成 zip，前端负责下载、保存和分享：

```ts
createExportJob(deviceId, fileIds): Promise<ExportJob>;
watchExportJob(jobId, onProgress): Unsubscribe;
shareExport(exportId, channel): Promise<ShareResult>;
```

分享渠道：微信、飞书、钉钉、邮箱。若某平台在当前系统不可用，前端应提示“当前设备暂不支持该分享方式”。

## 6. 页面接入任务拆分

### 6.1 权限页

- [ ] 接入真实权限查询。
- [ ] 接入权限申请弹窗或系统设置跳转。
- [ ] 两个权限都开启后自动跳转首页。
- [ ] 暂不设置后保持置灰和逻辑拦截。

### 6.2 首页 / 设备列表

- [ ] 接入设备列表接口或蓝牙 SDK 扫描结果。
- [ ] 扫描按钮显示真实扫描中状态。
- [ ] 连接 / 断开以真实设备状态为准。
- [ ] 连接失败、超时、设备忙碌需提示。

### 6.3 固件管理

- [ ] 接入固件版本列表。
- [ ] 按语义版本比较目标版本和当前版本。
- [ ] 创建固件任务。
- [ ] 轮询或订阅任务进度。
- [ ] 成功后刷新设备当前版本。
- [ ] 失败时展示失败状态并允许重试。

### 6.4 采集

- [ ] 开始采集创建会话。
- [ ] 实时数据改为轮询或订阅。
- [ ] 事件标记保存到当前采集会话。
- [ ] 删除上一次标记调用真实接口。
- [ ] 停止采集保存数据并刷新设备文件夹。

### 6.5 文件导出

- [ ] 查询设备文件夹。
- [ ] 批量删除文件。
- [ ] 创建导出任务。
- [ ] 监听导出进度。
- [ ] 导出完成后返回真实文件名和下载 / 本地路径。
- [ ] 分享渠道接入系统能力或后端能力。

### 6.6 设置

- [ ] 读取设置。
- [ ] 保存事件标记开关。
- [ ] 保存记录区间设置。
- [ ] 保存存储路径。
- [ ] 查询缓存大小。
- [ ] 清理缓存；采集中拒绝。

## 7. 前端校验规则

| 功能 | 前端校验 |
| --- | --- |
| 事件标记设置 | 至少保留一个事件开启 |
| 记录区间 | 事件前 1–120 秒；事件后 1–30 分钟；仅允许数字 |
| 固件版本 | 当前版本不可操作；高版本升级，低版本回退 |
| 文件导出 | 未选择文件时导出按钮禁用 |
| 文件删除 | 未选择文件时删除按钮禁用；删除前二次确认 |
| 清理缓存 | 采集中不可清理；清理前二次确认 |
| 权限 | 无权限时入口置灰且点击提示 |

后端必须做同样校验，不能只依赖前端。

## 8. 测试要求

### 8.1 单元测试

- 版本比较：高版本、低版本、当前版本。
- 记录区间校验。
- 事件标记至少保留一个开启。
- 文件多选、全选、取消全选。
- 权限缺失时的禁用状态。

### 8.2 集成测试

- 权限全部开启后自动进入首页。
- 连接设备后进入已连接列表。
- 断开设备二次确认。
- 低版本固件任务进入“固件回退”进度页。
- 高版本固件任务进入“固件升级”进度页。
- 固件进度页和完成页无左上角返回。
- 导出完成页无左上角返回。
- 采集中不允许清理缓存。

### 8.3 真实设备测试

- 多设备扫描稳定性。
- 蓝牙断连重连。
- 固件升级 / 回退中断恢复策略。
- 长时间采集的内存和性能。
- 大文件导出、删除、分享。
- Windows 免安装包权限、路径、杀毒软件拦截情况。

## 9. 发布配置建议

- 环境配置：通过本地 JSON 或 Electron preload 暴露 `apiBaseUrl`、日志级别、设备 SDK 配置。
- 日志：保留设备连接、采集、固件任务、导出任务、错误码。
- 崩溃恢复：固件任务、导出任务需要可恢复查询。
- 版本号：App 版本、前端资源版本、设备固件版本分开管理。
- 安全：Electron 继续关闭 Node 注入，后续如需原生桥接应使用 preload 白名单 API。
