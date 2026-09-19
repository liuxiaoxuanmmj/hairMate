# feat-002 工程基线

本切片是可执行的工程与连接基线：Expo 首页由用户点击连接，通过共享 API client 请求 Fastify `/health/ready`，后者用 Drizzle / node-postgres 检查真实 PostgreSQL。`/health/live` 仅检查进程。worker 是同仓的独立 Node 入口，检查 PG 后常驻并响应 SIGINT / SIGTERM；当前没有任务处理器、队列、业务表、迁移、登录或 AI 生成。

`ARCHITECTURE.md` / `MODULES.md` 保留设计基线原文；当前实现范围以 feature 状态和本文为准。HealthDependency 是进程依赖检查 Port，测试使用确定性 Fake 检查响应，生产连接检查使用真实 PG；Fake 不生成业务记录或假装完成图片任务。`AI_MODE=fake` / `STORAGE_MODE=local` 是默认配置，live、oss、production 尚未接入，均拒绝启动。

## 工具和依赖

| 项目 | 精确版本 | 核验依据 |
| --- | --- | --- |
| Node / pnpm | 22.23.2 / 10.33.4 | 本机实际运行；`.node-version`、`packageManager`、engine 与初始化检查约束 |
| Expo / Router | 55.0.31 / 55.0.18 | 官方 `expo-template-default@sdk-55` 55.1.39 与已安装 SDK 的版本检查 |
| React / React Native / RN Web | 19.2.0 / 0.83.10 / 0.21.2 | 官方 SDK 55 配套；三个平台 Metro 导出 |
| TypeScript / ESLint / typescript-eslint | 5.9.3 / 10.10.0 / 8.70.0 | engine / peer 校验、实际 lint/typecheck/build |
| Fastify / Zod | 5.12.4 / 4.6.4 | 同源 JSON Schema 的 HTTP 正反例 |
| pg / Drizzle | 8.23.0 / 0.45.2 | PostgreSQL 17.6 隔离容器实际连接与失败测试 |
| Vitest / Jest / jest-expo | 4.1.10 / 29.7.0 / 55.0.22 | 服务端和原生组件行为测试 |
| Playwright | 1.63.0，Chromium headless shell 1243 | 同一 Expo 页面、真实 HTTP、真实 PG 的浏览器执行环境 |

所有直接依赖为精确版本，传递依赖由 `pnpm-lock.yaml` 固定，安装启用严格 peer 校验，只放行 esbuild 的安装脚本。版本依据包括 [Expo SDK 对应关系](https://docs.expo.dev/versions/latest/)、[SDK 55 发布说明](https://expo.dev/changelog/sdk-55)、[Fastify 的 Node LTS 支持](https://fastify.dev/docs/v5.7.x/Reference/LTS/)；实际 npm 官方 registry 元信息与执行结果才是本仓组合的验证证据。未声称采用每个工具的最新主版本。

Better Auth、AI SDK、pg-boss、OSS SDK 和 Drizzle 迁移工具随首个实际消费者切片引入并验证版本，当前不为预留边界安装无调用方的 SDK。

## 验证与边界

| 命令 | 实际范围 |
| --- | --- |
| `pnpm run lint` | ESLint 与 TypeScript AST 依赖图、客户端生产包依赖闭包、禁止跳过测试 |
| `pnpm run typecheck` | 服务端、工具、测试和 Expo TSX 类型检查 |
| `pnpm run test:unit` | 配置、测试库护栏、HTTP 客户端、worker 生命周期；jest-expo 原生组件连接/失败/取消 |
| `pnpm run test:integration` | 实际 API/HTTP client/Drizzle/PG 协作、worker PG 检查、连接关闭及不存在的测试库 |
| `pnpm run test:contracts` | 健康/错误 DTO、JSON Schema、未知输入、服务端 requestId、CORS、同源静态 OpenAPI |
| `pnpm run test:architecture` | 合法与最小违规源码、别名/重导出/动态导入/环、包闭包、产物检查器、精确工具和约束映射 |
| `pnpm run build` | 五个 Node/共享包 TS 编译，Expo Android/iOS/Web JS/Hermes 导出及三个源映射安全检查 |
| `pnpm run test:e2e` | 重新编译实际 API/worker，导出同一 Expo 页面供浏览器执行；点击连接、真实 API 停止后的失败、重启后用户重试；worker 启停 |

E2E 中不 mock API、client、数据库或 App 组件。React Native Web 只作为当前页面的自动化执行面，没有新增面向用户的 Web 产品或发布。它不证明原生权限、拍照、会话恢复、PDF、签名安装包或真机可用；那些门槛随相关切片和首批设备确定后执行。当前连通性链路不是六步业务 Golden Path。

约束清单在 [architecture-constraints.json](./architecture-constraints.json)：11 组已落地基线检查，其余按模块/不变量列为 pending，注明触发条件与计划测试路径。没有生成 pending 的测试文件或空业务模块。约束文档摘要发生变化时测试失败，需逐项审阅映射，不能只更新摘要。

现有图检查证明静态导入方向和客户端包边界；表归属、只读事实的业务可信性、同 PG 事务、并发锁、删除/撤销屏障、来源历史和预算不变量仍待对应实现的行为测试。不能用静态图通过证明这些语义成立。

## 环境与产物

命令不自动加载 `.env`，Expo 明确设置 `EXPO_NO_DOTENV=1`。集成和 E2E 必须提供 `APP_ENV=test` 与 `TEST_DATABASE_URL`：仅接受 `127.0.0.1` / `::1`、`hairmate_test` 或其下划线后缀库名、`hairmate_test` 角色，无连接参数覆盖；连接后再核实实际数据库与角色。不回退 `DATABASE_URL`，不执行迁移或通用清库。

`infra/compose.test.yaml` 仅监听本机 55432；使用无真实凭据的本地 trust 认证和 tmpfs 数据。这个配置仅用于隔离测试，不是部署模板。测试只执行连接/查询，不创建业务表。E2E 的 API 与静态执行面固定使用回环 3107 / 3108，端口占用时失败，不复用现有服务。

Node 编译产物位于各 package / app 的 `dist/`；Expo 完整导出位于 `apps/mobile/dist/`；E2E 专用页面在 `apps/mobile/.expo/e2e-web/`。这些均被 Git 忽略。构建时注入无敏感内容的服务端专用测试标记，源映射检查会拒绝其进入客户端。当前源映射为本地验收材料，不是发布配置。

导出使用 `--clear` 重新构建，防止更换公开 API 地址后沿用旧的 Metro 转换缓存。E2E 同时断言浏览器发出的请求地址，避免误连默认地址或其他服务。

静态契约见 [openapi.json](./openapi.json)，由已审阅的 `node --import tsx scripts/openapi.ts` 生成；契约测试比较生成结果以防漂移。当前只包含两个健康接口，后续业务接口继续使用 `/api/v1`，认证桥接单独 `/api/auth/*`。
