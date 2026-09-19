# HairMate — Coding Agent Instructions

本文件是工作入口，不是产品方案副本。使用中文沟通；代码标识沿用英文契约。当前实现进度以仓库和状态文件为准，设计文档的 [MVP] 不代表已实现。

## Startup Workflow

Before writing code:

1. 执行 pwd、git status --short、git log --oneline -5，识别并保留用户已有改动；不要求工作区先变成 clean。
2. 完整阅读本文件、[feature_list.json](./feature_list.json)、[progress.md](./progress.md)、[session-handoff.md](./session-handoff.md)。历史交接不替代当前用户指令。
3. 首次进入先读[产品文档](./2026-09-12-hairmate-product-v1.0.0-design.md)、[ARCHITECTURE.md](./ARCHITECTURE.md)、[MODULES.md](./MODULES.md) 的范围与总览；变更前完整阅读相关模块和调用链章节。
4. 审阅并运行 ./init.sh，记录基线。既有失败只在本次授权范围内处理，不为全绿擅改无关内容。
5. 明确当前授权、目标验收与文件范围，再选择一个依赖已满足的 feature。没有开发请求时，不因待办存在自动开始实现。

## Project Map & Invariants

- 产品范围看产品文档；技术目标、分层和非目标看 ARCHITECTURE §1–3、§11；模块契约看 MODULES §1–4；事务、异步和失败看 MODULES §5–8；验证看 ARCHITECTURE §9.7。冲突先核实并报告，不自行改需求。
- 沿用 App-first Expo / React Native / TypeScript、Fastify API + Node worker、pnpm workspace、PostgreSQL 模块化单体；版本和候选供应商按架构验证，不因初始化重选技术栈。
- 仅十个业务模块：identity、profiles、journeys、styling、simulations、briefs、haircuts、media、consultations、ai-operations。workflows / ai-runtime / infrastructure / composition 不是新业务域。
- 跨模块由 workflows 调 public.ts 并传只读事实；不得模块互调、深层导入、取得他域 Repository 或改他域表。Adapter 依赖 Port；domain / application 不导入框架、ORM、队列或供应商 SDK。
- Mobile 仅共享客户端 contracts / api-client / 纯逻辑，不导入 server、数据库、服务端 SDK 或 Secret。用户素材由 media 独占对象操作，其他模块只持 assetId。
- LLM 提议、Runtime 编排、Tool 调叶子用例；权限、校验、状态和额度由确定性代码控制。用户确认只走可信用户通道；confirmed: true、模型原话和入队时允许标记都不是授权。
- 档案快照、方案 / Brief、现场及反馈修订保留来源和历史；Brief 使用方案绑定快照，unknown / inferred 不冒充 confirmed。完整闭环核实同一 visitId；执行成功、图片质量、满意度和闭环分别判断。
- 必需业务记录、预算和 job / 工具检查点使用同一真实 PG 事务，网络在事务外。已派发且结果不明不自动重发；遵守统一锁序、预算原子性、删除 / 撤销屏障和晚到结果规则。

## Working Rules — Stay in Scope

- **One feature at a time**：最多一个 in-progress，与 activeFeatureId 一致。依赖、验收、status、evidence 在 feature_list.json；新增待办不等于执行授权。
- 按当前纵向切片建文件，不先生成十模块空树。[Reserved] 只留边界，[Future] 不开发；不引入微服务、通用事件总线或未经批准的功能。
- 主 Agent 独占修改 feature_list.json、progress.md、session-handoff.md。并行任务明确文件所有权、接口及验证要求；子 Agent 不递归委派，不并发改同一文件，由主 Agent 集成复核。
- 搜索优先 rg；修改使用 apply_patch 或已审阅的专用生成器。保留用户改动，不用 reset / checkout / 清库解决脏工作区，不为“干净”删文件。
- 本地只读检查可直接执行。依赖安装、迁移、外部服务、付费模型及真实照片测试按当前授权和环境权限执行；不自动采购、部署、上传照片、提交或 push。
- Secret、照片、原始对话、完整 Prompt、签名 URL 不进入代码、日志、夹具、状态或交接。未经明确允许不读取实际 .env 或使用生产库。

## Verification Commands

~~~bash
./init.sh                 # 无 package.json：仅 harness；有清单：还必须运行应用检查
./init.sh --harness-only  # 仅协作文件 / 验证器，不能证明应用完成
./init.sh --app           # 必须有应用工程；缺清单、脚本或环境即失败
~~~

- harness 入口仅需 Bash、Node 内置能力和 Git；不安装包、不加载 .env、不启动服务、不迁移或清库。
- 根目录真实实现并审阅七项命令：pnpm run lint、pnpm run typecheck、pnpm run test:unit、pnpm run test:integration、pnpm run test:contracts、pnpm run test:architecture、pnpm run build；不能用 echo、空测试或“命令存在”充当通过。
- 涉及跨组件修改时，还必须通过 pnpm run test:e2e。当前 init.sh 已包含端到端检查；它验证同一 Expo 页面经浏览器执行到真实 API / PG 的基线链路，不能替代原生设备或业务 Golden Path 验收。
- 应用检查使用 Fake / 本地素材模式，不调用付费 Provider；真机、真实模型及理发另验收。集成测试必须自行校验 TEST_DATABASE_URL 为隔离测试库；缺环境就是未验证，不能改连生产库。
- 遇到首个失败即退出；区分 harness、应用自动检查、人工 / 真实环境验证。结构校验和技能评分不证明产品可用。

## Testing Rules — Required Levels

应用任务必须按以下三个层级验收；lint、typecheck、build、契约测试和架构检查不能替代必需的行为测试。

| 层级 | 通过要求 | 命令与验证范围 |
| --- | --- | --- |
| 层级 1：单元测试 | **必须通过** | pnpm run test:unit；验证受影响的领域 / 应用规则、正常与异常路径、权限及边界条件 |
| 层级 2：集成测试 | **必须通过** | pnpm run test:integration；验证组件协作、接口与持久化行为；涉及事务时使用隔离的真实 PostgreSQL |
| 层级 3：端到端测试 | **涉及跨组件修改时必须通过** | pnpm run test:e2e；从实际用户入口贯通受影响链路，验证可观察结果；外部 Provider 使用 Fake，不以 mock 内部组件替代链路 |

- 跨组件按调用链影响判断，不按改动文件数判断：包括 App ↔ API、API ↔ worker、跨业务模块工作流，以及影响多个消费者的共享契约变更。即使只改一个文件，影响跨组件交互也须执行层级 3。
- **跳过任何必须层级的任务 = 未完成。** 缺少脚本 / 环境、零有效用例、将必测用例设为 skip / todo、未执行或执行失败，均不算通过；任务保持 in-progress / blocked，记录原因和下一步。
- evidence 必须逐层记录命令、退出码、结果摘要和覆盖范围；层级 3 不适用时写明未涉及跨组件修改的依据，不能静默省略。
- 当前应用基线的实现和证据见状态文件；尚无业务模块、认证或生成闭环。文档 / harness 变更按 harness 检查验收，不得据此宣称应用的任一测试层级已通过。

## ARCHITECTURE Constraint Checks

- **每条架构约束都必须有对应的自动化测试或 lint 规则**，覆盖本文件、ARCHITECTURE.md 与 MODULES.md 的约束。维护“约束出处 → 测试文件 / 规则 ID → 执行命令”的可追溯映射；新增或修改约束时同步更新映射与检查。
- 映射入口为 [architecture-constraints.json](./architecture-constraints.json)；基线说明见 [engineering-baseline.md](./engineering-baseline.md)。源码依赖图、客户端传递包依赖、Metro 产物和规则正反例分别检查；待实现的业务语义不算已验证。
- 尚无应用实现的约束明确记录为待验证，随对应切片落实检查；相关应用 feature 在约束检查缺失或未通过时不得标 done。不得为测试提前实现 [Reserved] / [Future] 功能。
- 静态依赖用 lint / 架构测试，权限、状态、事务和并发语义用行为测试；不能只靠文档、注释或人工复核。下表是检查方式示例，不是约束清单的上限。

| 架构约束示例 | 对应测试或 lint 规则 |
| --- | --- |
| 十模块边界；跨模块仅由 workflows 调 public.ts，不互调、深层导入、访问他域 Repository / 表或形成循环 | `pnpm run lint`、`pnpm run test:architecture`：解析依赖图、公开出口和表归属，拒绝非法依赖 |
| Adapter 依赖 Port；domain / application 不导入框架、ORM、队列或供应商 SDK | `pnpm run lint`、`pnpm run test:architecture`：分层导入规则与依赖方向检查 |
| Mobile 仅共享客户端契约 / 纯逻辑，contracts 不泄漏服务端类型；客户端不包含服务端包、Node.js 专用 API 或 Secret | `pnpm run lint`、`pnpm run test:architecture`：客户端导入、重导出、传递依赖及构建产物检查 |
| 用户素材对象操作归 media，其他模块只持 assetId | `pnpm run test:architecture`、`pnpm run test:integration`：存储依赖边界、素材引用和所有权检查 |
| 用户确认走可信用户通道；权限、状态和额度由确定性代码控制；Runtime / Tool 不递归启动顶层工作流 | `pnpm run test:unit`、`pnpm run test:integration`：伪造确认、越权和非法状态的拒绝用例；`pnpm run test:architecture` 检查 Runtime / Tool 依赖 |
| 快照、方案 / Brief、现场及反馈保留来源和历史；unknown / inferred 不冒充 confirmed；同一 visitId 闭环，成功、质量、满意度分别判断 | `pnpm run test:unit`、`pnpm run test:integration`：版本追加、绑定快照、来源和闭环判定的正反例 |
| 业务记录、预算、job / 工具检查点同一真实 PG 事务，网络在事务外；遵守锁序、删除 / 撤销屏障、晚到结果及结果不明不重发 | `pnpm run test:integration`：真 PG 回滚、并发争抢、故障恢复及屏障竞态用例，断言派发时机与次数 |
| composition 显式装配；不新增业务域、事件总线、全局 Service Locator 或未授权的 Reserved 运行注册 | `pnpm run test:architecture`：模块、依赖及运行注册清单检查 |

- 检查必须能识别违规；用最小违规样例验证规则会失败，并保留正常样例验证合法依赖可通过。依赖检查应处理路径别名、重导出和动态导入，不能把单个字符串扫描当作完整覆盖。
- 文本扫描仅作补充；必须区分“无匹配”和“执行错误”，必需路径缺失或检查工具失败须非零退出，不得输出成功或用忽略错误的逻辑吞掉失败。

## Definition of Done

A feature is done only when:

1. 本次获授权的验收全部满足、依赖均 done；不以占位或降级成功偷换目标。
2. 检查实际执行并通过，记录 command and output 摘要、日期、范围和未验证项；应用任务须通过层级 1、层级 2，以及跨组件修改要求的层级 3，并通过对应架构约束检查；跳过任何必须层级即未完成，不能仅凭 harness 通过标 done。
3. 已做 diff / 边界复核及必要错误、权限测试；范围或契约变更具备对应批准和文档更新。
4. 状态、证据已同步，下一会话可 restartable；测试失败或环境缺失保持 in-progress / blocked 并说明，不编造成功。

## End of Session

1. 更新 feature_list.json 的 status / evidence / activeFeatureId；结构校验不能代替真实证据复核。
2. 更新 progress.md 的 Current State，追加本轮结果、决策和检查；架构细节留在原文档。
3. 更新 session-handoff.md：目标、文件、命令结果、Blockers、未验证项、下一安全动作与授权边界，不留占位。
4. 复跑适用检查及 git diff --check / git status --short，保留用户改动；仅在本次明确要求时提交。
5. 最终回复成果链接、真实检查和未完成项。无后续执行授权则停在交接，不自动启动待办。
