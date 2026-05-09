# FE25 Test APP UI 到后端交付文件

本文档是给后端团队的 UI/交互交付物，等价于 UI 设计师已经把页面、状态、交互和后端依赖整理完成。后端实现接口时，以本文档和 `BACKEND_DEVELOPMENT.md` 为准，保证接口返回能够驱动当前 iOS / Android App 的全部页面和交互。

## 1. 交付结论

当前前端已经完成以下 UI 和交互闭环：

- 页面结构：启动、权限、首页设备列表、设备详情 / 采集、固件管理、固件进度、固件完成、数据导出、设备文件夹、导出进度、导出完成、设置、事件标记设置。
- 组件状态：主按钮、次按钮、危险按钮、禁用按钮、卡片、列表、下拉菜单、开关、Toast、弹窗、进度条、底部 Tab。
- 交互状态：权限缺失置灰、连接 / 断开、采集中、停止保存、事件标记、删除上一次标记、固件升级 / 回退、导出 / 删除文件、分享、清理缓存。
- 移动端适配：iOS / Android WebView 全屏、安全区、触控滚动、底部手势区避让。

后端需要重点实现：设备、采集、固件任务、文件导出、分享、设置、缓存等接口和异步任务状态。

## 2. 后端必须支持的 UI 状态

| UI 状态 | 后端需要提供 / 校验 | 前端展示 |
| --- | --- | --- |
| 蓝牙权限未开启 | 后端不保存系统权限，但接口仍需校验设备是否可操作 | 扫描、连接、断开、固件、采集入口置灰 |
| 存储权限未开启 | 后端可返回文件/导出接口错误，但前端优先置灰 | 导出、文件删除、存储路径、清理缓存入口置灰 |
| 设备已连接 | `Device.status=connected` | 已连接设备列表，可进入详情、升级、断开 |
| 设备可连接 | `Device.status=available` | 可连接设备列表，仅显示连接按钮 |
| 采集中 | `CollectionSession.status=collecting` | 显示采集时间，开始按钮变“采集中...”，停止按钮可用 |
| 无采集任务 | 无 active collection | 事件标记提示“请先开始采集” |
| 有事件标记 | marker 列表非空 | “删除上一次标记”按钮可用 |
| 固件目标版本高于当前版本 | `FirmwareJob.action=upgrade` | 标题“固件升级”，按钮“升级为 xxx 版本” |
| 固件目标版本低于当前版本 | `FirmwareJob.action=rollback` | 标题“固件回退”，按钮“回退为 xxx 版本” |
| 固件任务运行中 | `status=running`, `progress=0..100` | 进度页，无左上角返回 |
| 固件任务完成 | `status=success` | 操作完成页，无左上角返回，仅“完成” |
| 文件未选择 | `selectedFiles=[]` | 导出、删除按钮禁用 |
| 导出任务运行中 | `ExportJob.status=running` | 导出进度页，可后台导出 |
| 导出任务完成 | `ExportJob.status=success` | 导出完成页，无左上角返回，展示分享入口 |
| 采集中清理缓存 | 后端返回 `COLLECTION_RUNNING` | Toast：当前存在采集任务，请停止采集后再清理 |

## 3. 页面级后端依赖

### 3.1 权限申请页

UI 已处理系统权限状态。后端不需要保存系统权限，但所有设备/文件相关接口必须做业务校验。

后端关注点：

- 设备操作接口必须校验设备是否存在、是否在线、是否已连接。
- 文件和导出接口必须校验文件是否存在、是否属于该设备、用户是否可访问。

### 3.2 首页 / 设备列表

后端需要返回已连接设备与可连接设备。

建议接口：

- `GET /api/devices`
- `POST /api/devices/scan`
- `POST /api/devices/{deviceId}/connect`
- `POST /api/devices/{deviceId}/disconnect`

UI 规则：

- 已连接设备：点击卡片进入详情；显示“升级”“断开”。
- 可连接设备：点击卡片空白不进入详情；只允许点击“连接”。
- 断开前前端已二次确认；后端仍需校验设备状态。

### 3.3 设备详情 / 数据采集

后端需要支持采集会话、实时数据、事件标记。

建议接口：

- `POST /api/collections`
- `POST /api/collections/{collectionId}/markers`
- `DELETE /api/collections/{collectionId}/markers/latest`
- `POST /api/collections/{collectionId}/stop`
- `GET /api/devices/{deviceId}/telemetry/latest` 或 WebSocket / SSE

UI 规则：

- 开始采集后进入采集中状态并显示计时。
- 事件标记保存当前采集内的相对时间。
- “删除上一次标记”只删除当前采集会话最后一条未删除标记。
- 停止采集必须保存数据，并刷新后续设备文件夹数据。

### 3.4 固件管理 / 升级 / 回退

后端需要返回版本列表，并创建升级或回退任务。

建议接口：

- `GET /api/firmwares?deviceId={deviceId}`
- `POST /api/devices/{deviceId}/firmware-jobs`
- `GET /api/firmware-jobs/{jobId}` 或 WebSocket / SSE

UI 规则：

- 当前版本和最新版本卡片始终保留。
- 目标版本通过下拉菜单选择。
- 目标版本高于当前版本：升级。
- 目标版本低于当前版本：回退。
- 目标版本等于当前版本：按钮禁用。
- 固件进度页、完成页均不显示左上角返回。
- 完成后当前版本更新为目标版本。

后端返回示例：

```json
{
  "id": "FW-20260509-0001",
  "deviceId": "E00-01",
  "sourceVersion": "v1.0.8",
  "targetVersion": "v1.0.7",
  "action": "rollback",
  "status": "running",
  "progress": 42,
  "message": "正在传输固件..."
}
```

### 3.5 数据导出 / 设备文件夹

后端需要按设备返回采集文件，并支持多选删除、多选导出。

建议接口：

- `GET /api/devices/{deviceId}/files`
- `DELETE /api/files`
- `POST /api/export-jobs`
- `GET /api/export-jobs/{jobId}` 或 WebSocket / SSE
- `POST /api/exports/{exportId}/share`

UI 规则：

- 底部“导出”直接进入设备选择页，不存在多设备导出入口。
- 设备行右侧是简约箭头，点击整行进入设备文件夹。
- 文件名必须包含采集时间和事件类型。
- 文件行展示文件名和文件大小。
- 文件支持多选、全选、批量删除、批量导出。
- 导出完成页不显示左上角返回，展示微信、飞书、钉钉、邮箱分享入口。

文件返回示例：

```json
{
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
```

### 3.6 设置

后端需要支持事件标记设置、记录区间设置、存储路径、缓存统计和缓存清理。

建议接口：

- `GET /api/settings`
- `PATCH /api/settings`
- `GET /api/cache`
- `DELETE /api/cache`

UI 规则：

- 事件标记至少保留一个开启项。
- 事件前记录区间：1–120 秒。
- 事件后记录区间：1–30 分钟。
- 当前存储路径可调整。
- 清理缓存需要二次确认。
- 采集中不允许清理缓存。

## 4. 后端接口响应必须满足的展示字段

### Device

- `id`
- `name`
- `status`
- `firmwareVersion`
- `latestFirmwareVersion`
- `batteryLevel`（真实设备接入后建议提供）
- `lastSeenAt`

### CollectionSession

- `id`
- `deviceId`
- `status`
- `startedAt`
- `stoppedAt`
- `durationSeconds`
- `savedFileIds`

### EventMarker

- `id`
- `collectionId`
- `deviceId`
- `type`
- `offsetSeconds`
- `createdAt`
- `deletedAt`

### FirmwareJob

- `id`
- `deviceId`
- `sourceVersion`
- `targetVersion`
- `action`
- `status`
- `progress`
- `message`
- `errorCode`
- `errorMessage`

### DataFile

- `id`
- `deviceId`
- `collectionId`
- `name`
- `sizeBytes`
- `sizeText`
- `eventType`
- `capturedAt`
- `storagePath`

### ExportJob

- `id`
- `deviceId`
- `fileIds`
- `status`
- `progress`
- `outputName`
- `downloadUrl`
- `createdAt`
- `finishedAt`

## 5. 前端展示文案与错误码映射

| 错误码 | 建议前端文案 |
| --- | --- |
| `PERMISSION_REQUIRED` | 请先开启对应权限。 |
| `DEVICE_NOT_FOUND` | 设备不存在或已离线。 |
| `DEVICE_NOT_CONNECTED` | 请先连接设备。 |
| `COLLECTION_RUNNING` | 当前存在采集任务，请停止采集后再操作。 |
| `NO_ACTIVE_COLLECTION` | 请先开始采集。 |
| `NO_MARKER_TO_DELETE` | 暂无可删除的标记事件。 |
| `INVALID_RECORD_RANGE` | 输入无效，请检查记录区间。 |
| `NO_FILE_SELECTED` | 请先选择文件。 |
| `FIRMWARE_JOB_FAILED` | 固件操作失败，请重试。 |
| `EXPORT_JOB_FAILED` | 数据导出失败，请重试。 |

## 6. 后端联调验收清单

### 设备

- [ ] `GET /api/devices` 能区分 connected / available。
- [ ] 连接成功后设备进入已连接列表。
- [ ] 断开成功后设备进入可连接列表。
- [ ] 设备不可用时返回明确错误码。

### 采集

- [ ] 开始采集返回 `collectionId`。
- [ ] 实时数据可轮询或推送。
- [ ] 标记事件能保存 `type` 和 `offsetSeconds`。
- [ ] 删除上一次标记只影响当前采集会话最后一条未删除标记。
- [ ] 停止采集后生成文件，并可在设备文件夹查到。

### 固件

- [ ] 版本列表包含当前版本、最新版本、可选目标版本。
- [ ] 高版本任务返回 `action=upgrade`。
- [ ] 低版本任务返回 `action=rollback`。
- [ ] 任务进度能从 0 推进到 100。
- [ ] 完成后设备当前版本更新为目标版本。

### 导出

- [ ] 设备文件夹按设备返回文件列表。
- [ ] 文件字段包含文件名、大小、事件类型、采集时间。
- [ ] 支持批量删除文件。
- [ ] 支持多选文件创建导出任务。
- [ ] 导出完成后返回 `outputName` 和下载 / 本地路径。
- [ ] 分享接口支持微信、飞书、钉钉、邮箱。

### 设置

- [ ] 保存事件设置时至少保留一个开启项。
- [ ] 记录区间后端校验范围：事件前 1–120 秒，事件后 1–30 分钟。
- [ ] 清理缓存前校验是否存在采集任务。
- [ ] 缓存清理后返回最新缓存大小。

## 7. 交付给后端的最小文件清单

后端团队只需要优先阅读以下文件：

1. `docs/BACKEND_UI_HANDOFF.md`：UI 状态、页面依赖、验收清单。
2. `BACKEND_DEVELOPMENT.md`：接口草案、数据模型、错误码、异步任务建议。
3. `docs/FRONTEND_ENGINEERING_SPEC.md`：前端接真实设备和真实接口的工程拆分。
4. `app.js`：当前交互状态机和本地数据结构参考。

