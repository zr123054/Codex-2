# FE25 Test APP 后端开发资料

本文档基于当前 FE25 Test APP 前端应用基线整理，供后端开发、联调和接口评审使用。当前仓库已经完成离线 UI、前端交互和状态流转；接入真实后端时可按本文档拆分接口、数据模型与任务状态。


## 0. 与 UI / 前端资料的关系

- `docs/UI_DESIGN_SPEC.md` 定义真实产品 APP 的视觉规范、页面结构、组件状态和交互验收点。
- `docs/FRONTEND_ENGINEERING_SPEC.md` 定义前端从当前本地状态切换到真实设备、真实后端和真实文件能力时的工程拆分。
- 本文档定义后端需要提供的数据、接口、异步任务、错误码和联调验收标准。

后端实现时应以本文件的接口契约为主，同时对照 UI / 前端文档中的状态和验收点，保证接口返回能够驱动完整前端交互。

## 1. 当前前端范围

### 1.1 已完成的前端能力

- Electron 免安装桌面应用壳：加载本地 `index.html`，无需浏览器和后端服务。
- 单页应用路由：所有页面切换由 `app.js` 控制，不刷新窗口。
- 权限流程：蓝牙权限、存储权限；点击“暂不设置”后相关功能置灰且逻辑层拦截。
- 设备列表：扫描、连接、断开二次确认、进入设备详情、进入固件管理。
- 固件管理：当前版本 / 最新版本卡片、目标版本下拉菜单、自动判断升级或回退、确认弹窗、进度页、完成页。
- 数据采集：开始采集、计时、停止并保存、事件标记、删除上一次标记。
- 数据导出：按设备进入文件夹、文件列表展示、文件多选、全选、导出、删除、导出进度、导出完成与分享入口。
- 设置：事件标记设置、记录区间设置、存储路径设置、清理缓存、关于信息。
- 通用 UI：手机容器、iPhone 风格状态栏、底部 Tab、Toast、弹窗、进度条、禁用态、危险操作二次确认。

### 1.2 当前离线数据源

- 设备扫描、连接、断开状态。
- 固件版本、升级 / 回退任务、任务进度。
- 采集会话、事件标记、实时数据。
- 设备文件夹、采集数据文件、导出 zip、分享结果。
- 存储路径、缓存占用、设置项。

## 2. 前后端边界

| 业务域 | 前端职责 | 后端职责 |
| --- | --- | --- |
| 权限 | 调用系统权限并控制按钮置灰；未授权时拦截操作 | 不保存系统权限，但需要校验业务请求是否合法 |
| 设备 | 展示设备列表、连接状态、按钮状态、详情入口 | 维护设备档案、连接状态、最后在线时间、设备能力 |
| 采集 | 展示采集状态、计时、事件按钮、实时数据 | 创建采集会话、保存事件标记、生成采集文件、提供实时数据 |
| 固件 | 展示版本下拉、确认弹窗、进度、完成页 | 提供版本列表，创建升级 / 回退任务，推送进度和结果 |
| 文件 | 展示设备文件夹、文件名、大小、多选操作 | 查询文件、批量删除、创建导出任务、生成下载文件 |
| 分享 | 展示微信、飞书、钉钉、邮箱入口和结果提示 | 对接分享渠道或返回外部分享参数 |
| 设置 | 表单校验、开关状态、缓存清理确认 | 保存设置、校验范围、清理缓存或返回缓存统计 |

## 3. 页面与接口映射

| 前端页面 / 操作 | 建议接口 | 说明 |
| --- | --- | --- |
| 首页设备列表 | `GET /api/devices` | 返回已连接设备与可连接设备 |
| 扫描设备 | `POST /api/devices/scan` + `GET /api/devices` | 扫描可异步，也可直接刷新设备列表 |
| 连接设备 | `POST /api/devices/{deviceId}/connect` | 成功后设备进入已连接列表 |
| 断开设备 | `POST /api/devices/{deviceId}/disconnect` | 高风险操作，前端已二次确认 |
| 设备实时数据 | `GET /api/devices/{deviceId}/telemetry/latest` 或 WebSocket | 设备详情页展示实时数据 |
| 开始采集 | `POST /api/collections` | 返回 `collectionId` 和开始时间 |
| 标记事件 | `POST /api/collections/{collectionId}/markers` | 保存事件类型与采集内相对时间 |
| 删除上一次标记 | `DELETE /api/collections/{collectionId}/markers/latest` | 仅删除当前采集会话最后一个未删除标记 |
| 停止采集 | `POST /api/collections/{collectionId}/stop` | 保存采集数据并生成文件 |
| 固件版本列表 | `GET /api/firmwares?deviceId={deviceId}` | 返回可升级 / 可回退版本 |
| 创建固件任务 | `POST /api/devices/{deviceId}/firmware-jobs` | 后端根据版本判断或校验 `upgrade` / `rollback` |
| 固件任务进度 | `GET /api/firmware-jobs/{jobId}` 或 WebSocket | 进度 0–100，完成后更新设备版本 |
| 设备文件夹 | `GET /api/devices/{deviceId}/files` | 返回文件名、大小、事件类型、采集时间 |
| 批量删除文件 | `DELETE /api/files` | 请求体传 `fileIds` |
| 创建导出任务 | `POST /api/export-jobs` | 请求体传 `deviceId` 和 `fileIds` |
| 导出任务进度 | `GET /api/export-jobs/{jobId}` 或 WebSocket | 进度 0–100，完成后返回文件名 / 下载地址 |
| 分享导出文件 | `POST /api/exports/{exportId}/share` | 支持微信、飞书、钉钉、邮箱 |
| 读取设置 | `GET /api/settings` | 返回记录区间、事件类型开关、存储路径等 |
| 保存设置 | `PATCH /api/settings` | 后端二次校验范围和至少一个事件开启 |
| 缓存统计 | `GET /api/cache` | 返回缓存大小 |
| 清理缓存 | `DELETE /api/cache` | 采集中应拒绝清理 |

## 4. 建议数据模型

### 4.1 Device

```json
{
  "id": "E00-01",
  "name": "E00-01",
  "status": "connected",
  "firmwareVersion": "v1.0.8",
  "latestFirmwareVersion": "v1.1.2",
  "batteryLevel": 82,
  "lastSeenAt": "2026-05-09T06:00:00Z",
  "capabilities": ["collection", "firmware", "export"]
}
```

字段说明：

- `status`：`connected`、`available`、`offline`。
- `firmwareVersion`：设备当前固件版本。
- `latestFirmwareVersion`：后端可按设备型号返回最新稳定版本。

### 4.2 Telemetry

```json
{
  "deviceId": "E00-01",
  "tension": 2.36,
  "tensionUnit": "tf",
  "drumSpeed": 48.6,
  "drumSpeedUnit": "r/min",
  "lineLength": 1280,
  "lineLengthUnit": "m",
  "releasedAmount": 3500,
  "avgTension": 25.6,
  "avgLineSpeed": 138.5,
  "forceCoefficient": 1.35,
  "temperature": 6,
  "yaw": 72,
  "runningStatus": "running",
  "workMode": "manual",
  "sampledAt": "2026-05-09T06:00:00Z"
}
```

### 4.3 CollectionSession

```json
{
  "id": "COL-20260509-0001",
  "deviceId": "E00-01",
  "status": "collecting",
  "startedAt": "2026-05-09T06:00:00Z",
  "stoppedAt": null,
  "durationSeconds": 90,
  "savedFileIds": []
}
```

字段说明：

- `status`：`collecting`、`stopped`、`saved`、`failed`。
- 停止采集后应返回最终时长和生成的文件 ID。

### 4.4 EventMarker

```json
{
  "id": "M-0001",
  "collectionId": "COL-20260509-0001",
  "deviceId": "E00-01",
  "type": "确认中鱼",
  "offsetSeconds": 90,
  "createdAt": "2026-05-09T06:01:30Z",
  "deletedAt": null
}
```

字段说明：

- `type` 必须来自事件类型枚举。
- 删除上一次标记建议软删除，便于审计。

### 4.5 FirmwareVersion

```json
{
  "version": "v1.1.2",
  "deviceModel": "FE25",
  "isLatest": true,
  "releaseNote": "性能优化、功能增强和问题修复。",
  "releasedAt": "2026-05-01T00:00:00Z"
}
```

### 4.6 FirmwareJob

```json
{
  "id": "FW-20260509-0001",
  "deviceId": "E00-01",
  "sourceVersion": "v1.0.8",
  "targetVersion": "v1.0.7",
  "action": "rollback",
  "status": "running",
  "progress": 42,
  "message": "正在传输固件...",
  "createdAt": "2026-05-09T06:00:00Z",
  "finishedAt": null,
  "errorMessage": null
}
```

字段说明：

- `action`：`upgrade` 或 `rollback`。
- 选择低版本时前端显示“固件回退”，后端也应返回 `rollback`。
- 进度页和完成页不提供左上角返回，任务应通过进度状态完成闭环。

### 4.7 DataFile

```json
{
  "id": "E0001-1",
  "deviceId": "E00-01",
  "collectionId": "COL-20260509-0001",
  "name": "2026-05-08_09-18-32_标准鱼讯.csv",
  "sizeBytes": 19503513,
  "sizeText": "18.6 MB",
  "eventType": "标准鱼讯",
  "capturedAt": "2026-05-08T09:18:32Z",
  "checksum": "optional-sha256",
  "storagePath": "内部存储 > FE25Test"
}
```

### 4.8 ExportJob

```json
{
  "id": "EXP-20260509-0001",
  "deviceId": "E00-01",
  "fileIds": ["E0001-1", "E0001-2"],
  "status": "running",
  "progress": 76,
  "outputName": "FE25_E00-01_Export.zip",
  "downloadUrl": null,
  "createdAt": "2026-05-09T06:00:00Z",
  "finishedAt": null
}
```

### 4.9 AppSettings

```json
{
  "eventTypes": [
    { "name": "标准鱼讯", "enabled": true },
    { "name": "疑似鱼讯", "enabled": true },
    { "name": "确认中鱼", "enabled": true },
    { "name": "疑似中鱼", "enabled": true },
    { "name": "挂底", "enabled": true },
    { "name": "脱钩", "enabled": true },
    { "name": "触底", "enabled": true },
    { "name": "断线", "enabled": true },
    { "name": "手动刺鱼", "enabled": true },
    { "name": "刺鱼中钩", "enabled": true },
    { "name": "异常", "enabled": true },
    { "name": "其他", "enabled": true }
  ],
  "recordBeforeSeconds": 30,
  "recordAfterMinutes": 3,
  "storagePath": "内部存储 > FE25Test"
}
```

## 5. 接口草案

### 5.1 通用响应格式

成功：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

失败：

```json
{
  "code": "DEVICE_NOT_CONNECTED",
  "message": "设备未连接",
  "details": {}
}
```

### 5.2 设备接口

#### GET /api/devices

响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "connected": [
      { "id": "E00-01", "name": "E00-01", "status": "connected", "firmwareVersion": "v1.0.8" }
    ],
    "available": [
      { "id": "E01-02", "name": "E01-02", "status": "available" }
    ]
  }
}
```

#### POST /api/devices/scan

响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "scanId": "SCAN-20260509-0001",
    "timeoutSeconds": 10
  }
}
```

#### POST /api/devices/{deviceId}/connect

响应：返回更新后的 Device。

#### POST /api/devices/{deviceId}/disconnect

响应：返回更新后的 Device。

### 5.3 采集接口

#### POST /api/collections

请求：

```json
{
  "deviceId": "E00-01"
}
```

响应：返回 CollectionSession。

#### POST /api/collections/{collectionId}/markers

请求：

```json
{
  "type": "确认中鱼",
  "offsetSeconds": 90
}
```

响应：返回 EventMarker。

#### DELETE /api/collections/{collectionId}/markers/latest

响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "deletedMarkerId": "M-0001"
  }
}
```

#### POST /api/collections/{collectionId}/stop

响应：返回最终 CollectionSession 和生成的 DataFile 列表。

### 5.4 固件接口

#### GET /api/firmwares?deviceId=E00-01

响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "currentVersion": "v1.0.8",
    "latestVersion": "v1.1.2",
    "versions": ["v1.1.2", "v1.1.0", "v1.0.8", "v1.0.7", "v1.0.6"]
  }
}
```

#### POST /api/devices/{deviceId}/firmware-jobs

请求：

```json
{
  "targetVersion": "v1.0.7"
}
```

响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "FW-20260509-0001",
    "deviceId": "E00-01",
    "sourceVersion": "v1.0.8",
    "targetVersion": "v1.0.7",
    "action": "rollback",
    "status": "running",
    "progress": 0
  }
}
```

#### GET /api/firmware-jobs/{jobId}

响应：返回 FirmwareJob。

### 5.5 文件与导出接口

#### GET /api/devices/{deviceId}/files

响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "deviceId": "E00-01",
    "files": [
      {
        "id": "E0001-1",
        "name": "2026-05-08_09-18-32_标准鱼讯.csv",
        "sizeBytes": 19503513,
        "sizeText": "18.6 MB",
        "eventType": "标准鱼讯",
        "capturedAt": "2026-05-08T09:18:32Z"
      }
    ]
  }
}
```

#### DELETE /api/files

请求：

```json
{
  "fileIds": ["E0001-1", "E0001-2"]
}
```

响应：返回删除数量。

#### POST /api/export-jobs

请求：

```json
{
  "deviceId": "E00-01",
  "fileIds": ["E0001-1", "E0001-2"]
}
```

响应：返回 ExportJob。

#### GET /api/export-jobs/{jobId}

响应：返回 ExportJob。完成后 `downloadUrl` 和 `outputName` 必须可用。

#### POST /api/exports/{exportId}/share

请求：

```json
{
  "channel": "wechat",
  "recipient": "optional"
}
```

支持渠道：

- `wechat`：微信
- `feishu`：飞书
- `dingtalk`：钉钉
- `email`：邮箱

### 5.6 设置接口

#### GET /api/settings

响应：返回 AppSettings。

#### PATCH /api/settings

请求：可部分更新。

```json
{
  "recordBeforeSeconds": 30,
  "recordAfterMinutes": 3,
  "storagePath": "内部存储 > FE25Test",
  "eventTypes": [
    { "name": "标准鱼讯", "enabled": true }
  ]
}
```

校验：

- `recordBeforeSeconds` 范围：1–120。
- `recordAfterMinutes` 范围：1–30。
- `eventTypes` 至少保留一个启用。

#### GET /api/cache

响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "sizeBytes": 2523293286,
    "sizeText": "2.35 GB"
  }
}
```

#### DELETE /api/cache

约束：存在采集任务时返回错误 `COLLECTION_RUNNING`。

## 6. 异步任务建议

固件任务和导出任务都建议支持两种联调方式：

1. 轮询：前端每 500–1000ms 调用 `GET /api/*-jobs/{jobId}`。
2. WebSocket / SSE：后端推送任务进度，前端只监听状态变化。

任务通用状态：

```json
{
  "status": "pending | running | success | failed | canceled",
  "progress": 0,
  "message": "正在处理...",
  "errorCode": null,
  "errorMessage": null
}
```

## 7. 错误码建议

| 错误码 | 场景 | 前端提示建议 |
| --- | --- | --- |
| `PERMISSION_REQUIRED` | 客户端权限不足 | 请先开启对应权限。 |
| `DEVICE_NOT_FOUND` | 设备不存在 | 设备不存在或已离线。 |
| `DEVICE_NOT_CONNECTED` | 设备未连接 | 请先连接设备。 |
| `COLLECTION_RUNNING` | 采集中执行清理缓存等互斥操作 | 当前存在采集任务，请停止采集后再操作。 |
| `NO_ACTIVE_COLLECTION` | 未采集时标记事件 | 请先开始采集。 |
| `NO_MARKER_TO_DELETE` | 删除上一次标记但没有标记 | 暂无可删除的标记事件。 |
| `INVALID_RECORD_RANGE` | 记录区间超出范围 | 输入无效，请检查记录区间。 |
| `NO_FILE_SELECTED` | 未选择文件导出 / 删除 | 请先选择文件。 |
| `FIRMWARE_JOB_FAILED` | 固件升级 / 回退失败 | 固件操作失败，请重试。 |
| `EXPORT_JOB_FAILED` | 导出失败 | 数据导出失败，请重试。 |

## 8. 联调验收清单

### 8.1 设备与权限

- [ ] 未开启蓝牙权限时，扫描、连接、断开、设备详情、采集不可用。
- [ ] 未开启存储权限时，导出、文件选择、清理缓存、存储路径设置不可用。
- [ ] 连接设备后，设备从可连接列表移动到已连接列表。
- [ ] 断开设备前需要二次确认。

### 8.2 固件

- [ ] 目标版本高于当前版本时，按钮显示“升级为 xxx 版本”。
- [ ] 目标版本低于当前版本时，按钮显示“回退为 xxx 版本”。
- [ ] 选择当前版本时，按钮禁用。
- [ ] 低版本任务进度页标题为“固件回退”。
- [ ] 高版本任务进度页标题为“固件升级”。
- [ ] 固件进度页和完成页均不显示左上角返回。
- [ ] 任务完成后，当前固件版本更新为目标版本。

### 8.3 采集与事件

- [ ] 开始采集后计时开始，运行状态变为运行中。
- [ ] 未采集时点击事件标记提示“请先开始采集”。
- [ ] 采集中点击事件标记保存事件和相对时间。
- [ ] 删除上一次标记只删除最近一条标记。
- [ ] 停止采集需要二次确认，并保存采集数据。

### 8.4 文件导出

- [ ] 导出 Tab 直接进入设备选择页，不存在多设备导出入口。
- [ ] 设备行右侧为简约箭头，点击整行进入设备文件夹。
- [ ] 文件夹内显示文件名和文件大小，文件名包含时间和事件类型。
- [ ] 文件支持多选、全选、批量删除、批量导出。
- [ ] 未选择文件时导出和删除按钮禁用。
- [ ] 导出完成页不显示左上角返回，支持微信、飞书、钉钉、邮箱分享。

### 8.5 设置

- [ ] 事件标记设置至少保留一个开启项。
- [ ] 记录区间只允许数字，事件前 1–120 秒，事件后 1–30 分钟。
- [ ] 当前存储路径可调整并保存。
- [ ] 清理缓存需要二次确认。
- [ ] 采集中不允许清理缓存。

## 9. 前端接入真实后端时的改造点

当前离线状态集中在 `app.js` 的 `state` 对象和本地常量中。接入真实后端时建议按以下步骤改造：

1. 新增 `api.js`：封装 `fetch`、错误处理、超时和响应格式。
2. 将 `EXPORT_FILES`、`EXPORT_DEVICES`、`connected`、`available` 等本地数据替换为接口返回。
3. 将固件进度和导出进度的 `setInterval` 替换为任务轮询或 WebSocket。
4. 将采集实时数据改为 `GET latest telemetry` 轮询或 WebSocket 推送。
5. 将设置页的保存、清理缓存、存储路径更新改为真实接口。
6. 保留当前 UI 禁用态、二次确认、Toast 和表单校验，后端仍需做同样校验。

