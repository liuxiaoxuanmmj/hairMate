# Session Handoff

## Current Objective

- Last Updated: 2026-09-14（Asia/Shanghai）。
- feat-004「制定开发计划并修复根目录文档引用」已完成，activeFeatureId 为 null；feat-001–003 保留历史完成状态。
- [PLAN.md](./PLAN.md) 是本轮交付；feat-005–017 共 13 个切片仅为 not-started，未获实施授权。
- 当前仍只有 Expo 连接页、健康 API 和 PG 检查 worker，没有业务模块、认证、业务队列或生成闭环。
- 未提交或 push；本轮 HEAD 为 4486759，既有 README 改动、旧产品文档删除和未跟踪工程文件已保留。

## Completed This Session

- 阅读四个入口 / 状态文件、产品与架构相关章节、完整模块契约、约束映射及工程基线。
- 制定依赖顺序、十模块数据归属、版本 / 所有权约束、同 PG 原子组、统一锁序、18 组 pending 约束的测试落点及设备 / 模型 / 试点门槛；登记 13 个未启动切片，README 接入计划。
- 修复 [architecture-constraints.json](./architecture-constraints.json)、[engineering-baseline.md](./engineering-baseline.md)、[openapi.json](./openapi.json) 的使用方路径；OpenAPI 生成到根目录，内容未漂移。
- 复核既有文档大小写调整及全部约束，更新 sourceDigests；没有更改任何约束 status 或放宽规则。
- 恢复架构验证器及 TS 配置中被大小写替换误改的标准 Node / TypeScript 标识，使契约、架构及类型检查恢复运行。
- 同步 [feature_list.json](./feature_list.json)、[progress.md](./progress.md) 和本文件。三份源设计文档、工程基线正文及 OpenAPI 内容与会话前一致。

## Verification Evidence

以下为 2026-09-14 本轮证据，失败与修复过程见 progress.md 的 feat-004 记录。2026-09-13 的完整应用验收仅为历史基线，不当作本轮复跑。

| 检查 | 实际命令 | Exit / 结果 |
| --- | --- | --- |
| Harness | ./init.sh --harness-only | 0；状态、链接及验证入口通过 |
| 验证器正反例 | node scripts/verify-harness.test.mjs | 0；8/8，通过依赖 / 证据 / 单任务等检查 |
| 契约 / 架构用例 | node_modules/.bin/vitest run --project contracts --project architecture | 最终 0；6 个契约 + 16 个架构用例通过 |
| 实际依赖图 | node scripts/check-architecture.mjs | 最终 0；14 源码文件、客户端包闭包与测试门槛 |
| ESLint | node_modules/.bin/eslint . --max-warnings=0 | 0 |
| 服务端 / 共享包 / 工具引用 / 测试类型 | node_modules/.bin/tsc --noEmit -p tsconfig.check.json | 最终 0；不是 Expo 类型检查或构建 |
| OpenAPI 生成 | node --import tsx scripts/openapi.ts | 0；根目录产物与会话前一致 |
| 引用与范围 | 旧三路径 rg、内联文档链接 / 计划断言、快照 diff / 字节比较、git diff --check | 无旧路径匹配；文档与计划映射有效，设计和契约内容不变，diff 检查 0 |
| 默认入口 | ./init.sh | 1；启动时旧链接错误已修复；复跑通过 harness 后因 PATH 缺 pnpm 停止，应用检查未进入 |

应用层级 1 / 2 / 3 和 build 本轮未复跑。本轮只修改文档、工具引用 / 标准标识及状态，没有应用实现、共享业务 Schema 或组件交互变化，层级 3 不适用；不宣称业务、原生设备或真实环境验收。

## Files Changed

- 新增：PLAN.md。
- 文档 / 状态：AGENTS.md、README.md、feature_list.json、progress.md、session-handoff.md。
- 引用 / 摘要：architecture-constraints.json、scripts/openapi.ts、tests/contracts/http.test.ts、tests/architecture/tooling.test.ts。
- 验证工具标准标识：scripts/check-architecture.mjs、tsconfig.base.json。
- engineering-baseline.md 原有同目录链接有效，未改正文；openapi.json 重生成后内容相同。三份产品 / 架构 / 模块源文档保持会话前内容。

## Blockers / Environment / Unverified

- feat-004 范围内无剩余阻塞；当前 Node 22.23.2、已有 node_modules 可用，但 PATH 无 pnpm，上一会话临时 pnpm 目录已不存在。下一次按 [README.md](./README.md) 准备指定 pnpm 10.33.4，不依赖历史临时路径。
- 上一会话测试 PG 已清理，本轮未准备或启动数据库。应用集成 / E2E 必须显式提供并验证隔离 TEST_DATABASE_URL；不读实际 .env，不回退生产连接。
- E2E 固定使用回环 3107 / 3108，导出保留 --clear；重新准备环境需匹配浏览器。浏览器链路不能替代原生权限、会话、PDF、真实图片质量或真实理发。
- 18 组业务 / 真实环境约束仍 pending。当前 PROJECT_SCOPE 拒绝所有业务目录及未登记运行入口；后续仅按本次获授权切片更新允许范围并补正反例，不能批量放开十模块。
- 本轮未安装依赖、启动服务、迁移、开通云资源、调用付费模型、上传真实照片、部署或联系他人。真实设备、认证方式 / 找回、模型与样例用途、硬预算、保留策略继续按 PLAN 的决策门槛明确。

## Next Safe Action / Authorization

先阅读 AGENTS.md、三个状态文件及 PLAN.md，执行 startup 检查并核对最新用户请求。收到新的业务开发授权后优先选择 feat-005；依赖虽满足，not-started 不等于授权。先恢复工具 / 隔离测试基线，再落实 identity 的最小纵向切片与对应架构检查。

不要因为计划已登记或历史 feat-002 的环境授权而自动开始业务开发、安装服务或真实模型评测。真实适配评测 feat-015 可在 feat-010 后提早选择，但仍需独立用途、账号和硬预算授权；任何时候最多一个活动 feature。
