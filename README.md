# Memory

围绕朋友建立共同经历时间线，并把大批照片自动整理成可编辑手帐的私人记录 App。

## 已实现的首版能力

- 朋友主页、时间线和日历 API；同一经历可关联多位朋友。
- 未注册朋友占位身份、邮箱邀请、账号绑定及 Person 合并。
- Owner / Editor / Viewer 权限，参与者感受与私人感受隔离。
- 经历、活动瞬间、评论、修改历史和乐观锁冲突保护。
- 最多 200 张照片的 S3 分片上传、持久化移动端上传队列和后台重试。
- EXIF、SHA-256、感知哈希、清晰度/曝光评分、时间分组和推荐选图。
- 四种手帐模板、三档装饰、结构化布局版本和长图导出任务。
- Expo iOS/Android 客户端，以及 Next.js 邀请、查看和轻量编辑 Web。
- Supabase 邮箱 OTP 邀请验证、账号数据导出/确认删除、Sentry 与 OpenTelemetry。

## 工程结构

```text
apps/mobile   Expo + React Native
apps/web      Next.js
apps/api      NestJS + Prisma
apps/worker   BullMQ 图片与手帐任务
packages/contracts 共享 DTO、类型和实时事件
packages/media     图片分析、布局和导出引擎
```

## 本地启动

1. 复制 `.env.example` 为 `.env`。
2. 运行 `docker compose up -d` 启动 PostgreSQL、Valkey 和 MinIO。
3. `minio-init` 会自动创建私有桶、开启版本保护并配置分片上传所需的 CORS/ETag。
4. 运行 `pnpm install && pnpm db:generate && pnpm db:migrate`。
5. 分别运行 `pnpm --filter @togetherly/api dev`、`pnpm --filter @togetherly/worker dev`、`pnpm --filter @togetherly/web dev` 和 `pnpm --filter @togetherly/mobile dev`。

真机调试移动端时，把 `EXPO_PUBLIC_API_BASE_URL` 设置为电脑在局域网中的 API 地址；模拟器可继续使用默认地址。

开发环境默认接受 `x-user-id`、`x-user-email`、`x-user-name` 请求头。生产环境设置 `AUTH_MODE=production`，API 将仅接受 Supabase JWT。

## 隐私约束

- 业务客户端不直连数据库，对象存储保持私有。
- 手帐生成必须逐字保留 `sourceText`；布局引擎没有文字润色入口。
- 云视觉默认关闭，开启后仅发送最长边不超过 1024px 的预览，不发送原图、EXIF 或用户文字。
- 相似、模糊或曝光不足的照片只降低推荐状态，永不自动删除。

## 验证

`pnpm typecheck`、`pnpm test` 与各端 `build` 均可在仓库根目录执行。CI 会验证共享契约、权限策略、照片整理和原文不可变规则；连接完整本地基础设施后，再执行上传中断、邀请合并和越权访问的集成/E2E 场景。
