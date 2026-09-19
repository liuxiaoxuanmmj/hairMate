# HairMate 开发计划

日期：2026-09-14。状态：开发计划初稿；业务切片尚未启动。本轮授权为 feat-004「制定计划与修复引用」，不包含后续业务实现、真实模型调用或部署。

本计划把现有设计拆成可独立验收的实施步骤。产品范围以[产品文档](./2026-09-12-hairmate-product-v1.0.0-design.md)为准，技术与数据约束以 [ARCHITECTURE.md](./ARCHITECTURE.md) 为准，公开用例与原子组以 [MODULES.md](./MODULES.md) 为准。实时状态、依赖和证据统一维护在 [feature_list.json](./feature_list.json)；本文件中的顺序和测试路径是计划，不是完成证据。

## 1. 起点与交付目标

| 项目 | 当前事实 | 后续目标 |
| --- | --- | --- |
| 工程 | feat-001、002、003 已完成；六个 workspace 包，Expo 连接页、Fastify 健康接口、独立 worker | 按真实消费者增加业务实现，保持 App-first 模块化单体 |
| 数据 | API / worker 可以检查真实 PG；没有业务表、迁移或任务消费 | 单 PG、模块私有表与 Repository、不可变版本、必要同事务写入 |
| 契约 | [openapi.json](./openapi.json) 只有两个健康接口 | 按切片从共享 Schema 增量生成 `/api/v1` 业务契约；认证另走 `/api/auth/*` |
| 验证 | 2026-09-13 有完整工程验收记录，见 [progress.md](./progress.md)；不代表业务已通过 | 每个应用切片落实行为测试、约束检查和必要设备验收 |
| 架构检查 | [architecture-constraints.json](./architecture-constraints.json) 有 11 组基线检查、18 组 pending | 首次实现对应语义时增加正反例；不把整个约束组提前标为 enforced |

2026-09-14 启动 `./init.sh` 因迁移后的旧文档链接退出 1；本轮负责修复。当前 Node 为 22.23.2，项目依赖存在，`pnpm` 不在 PATH，上一会话的临时工具目录已不存在。下一次应用开发应先按 [README.md](./README.md) 恢复指定 pnpm 和隔离 PG 环境，并记录新的基线；历史通过不能替代复跑。

V1 的交付目标是：照片和需求确认 → 可解释推荐 → 至少一个有效基准比较 → 选择明确方案版本并确认、取得 Brief → 实际理发与现场记录 → 同一次理发的剪后、首次自行打理反馈。允许跨天续接；降级路径、完整闭环和满意度分别评价。

## 2. 实施边界

1. 继续使用现有 Expo / React Native / TypeScript、Fastify API + Node worker、pnpm workspace、PostgreSQL / Drizzle。已锁版本见 [engineering-baseline.md](./engineering-baseline.md)；Better Auth、pg-boss、AI / OSS SDK 和迁移工具在首个消费者切片引入，届时核验兼容性并锁定版本。
2. 只允许既定十个业务模块。`workflows` 组合各模块 `public.ts`，传只读且在必要事务内核实的事实；不接收其他模块的 Repository、表或 ORM 对象。运行与依赖方向遵循 MODULES §1–3。
3. App 只共享 contracts、api-client 和客户端纯逻辑；路由保持薄层，功能放入 `apps/mobile/src/features/`，会话、照片、导出放在平台边缘。服务端实现按需落在 `packages/server/src/modules/`、`workflows/`、`ai-runtime/`、`composition/` 和 `infrastructure/`。
4. 每次只启动一个依赖均 done 且获当前授权的 feature。所有新增 feature 先为 `not-started`；不为规划预生成业务模块、测试空壳或迁移文件。
5. 先实现各切片的确定性规则，再接公开用例、持久化、App 与 Fake Provider。真实推荐需要已有 AiRun 来源，因此可恢复顾问轮次排在推荐持久化之前；不伪造 Run 来提前展示“AI 推荐”。这落实 MODULES §9.1 的规则优先原则和 §5.1 的真实调用依赖。
6. 权限、版本、幂等、删除屏障、日志脱敏和相应测试随首次消费者交付。最后的全链路阶段负责组合复核，不能成为推迟这些约束的理由。

当前 `scripts/check-architecture.mjs` 的 PROJECT_SCOPE 仍拒绝一切业务模块目录及新增 workflows / ai-runtime 注册。首个消费者切片必须同步登记本次获授权的模块 / 入口、更新 BASE-01 的实际覆盖描述并补正反例；不能一次放开十模块或删掉范围检查来通过测试。

## 3. 切片顺序与依赖

下列全部业务 feature 当前为 `not-started`。依赖表示实施前置，不表示模块间可以直接调用。除 feat-015 可在 feat-010 完成后提早选择外，建议按表推进；仍只允许一个活动任务，不给出未经估算的工期承诺。

| Feature | 可观察交付 | 依赖 | 主要业务所有者 |
| --- | --- | --- | --- |
| feat-005 | 个人身份、会话恢复和用途授权 | feat-004 | identity |
| feat-006 | 用户确认档案、固化快照、创建和续接历程 | feat-005 | profiles、journeys |
| feat-007 | 私有照片上传、校验、引用和可恢复删除 | feat-006 | media；扩展已有所有者清理 |
| feat-008 | 有预算与检查点的后台顾问轮次 | feat-007 | consultations、ai-operations |
| feat-009 | 有依据的候选推荐与不可变方案版本 | feat-008 | styling、profiles |
| feat-010 | 已授权的基准模拟、派发、转存与失败恢复 | feat-009 | simulations、ai-operations、media |
| feat-011 | 人工质量检查、有效比较和明确方案选择 | feat-010 | simulations、journeys |
| feat-012 | Brief 草稿、确认、离线查看与本地 PDF 交付 | feat-011 | briefs、journeys、media |
| feat-013 | 实际理发、两类反馈和同 Visit 闭环评估 | feat-012 | haircuts、journeys、consultations |
| feat-014 | 六步 Fake 全链路、十模块删除恢复及试点统计规则 | feat-013 | 已实现所有者、workflows |
| feat-015 | 真实模型 / 存储适配器与授权样例评测 | feat-010；另满足真实调用门槛 | AI 执行边缘、media |
| feat-016 | 选定设备与受控真实环境验收 | feat-014、feat-015；另满足设备 / 部署门槛 | App 平台、identity、composition / infrastructure |
| feat-017 | 发起人真实闭环及五人试点评估 | feat-016；另有试点授权 | journeys 的试点记录及受控评估 |

### feat-005：可信身份与首批业务持久化

- 以 `/api/auth/*` 桥接 Better Auth，经 `ResolveActor` 映射业务 User，提供 `/api/v1/me` 和具名 Consent 确认 / 撤销入口。最终登录方式仍是开放决策；可按现有邮箱基线做本地验证，真实用户开放前确认登录与找回方式，禁止自制会话或用假邮件充当投递成功。
- 首批迁移只包含 identity 当前需要的表与约束。建立模块私有 Repository、具名事务绑定、用户动作与业务幂等记录；不先建其余九域表。认证表由 AuthPort / Better Auth 拥有，业务 User 不等同供应商对象。
- App 支持会话恢复、失效后重新登录、退出与切换账号清除受管理缓存。账号状态和用途同意由服务端检查，普通私人历史读取不强制新增模型用途授权。
- 验收包括伪造 actor / confirmed、跨用户访问、失效会话、已撤销同意、重复身份映射与错误回显。未接入完整清理前不能伪造“账号已删除”；清理入口在 feat-007 随首个异步消费者接通。

### feat-006：档案与历程

- 实现 `ApplyConfirmedProfileChange`、`CaptureProfileSnapshot`、`CreateJourney`、`ReadJourneyFacts` 和具名生命周期命令；API 使用 `/profile` 与 `/journeys`。此阶段先形成文字输入链路，照片能力由下一切片提供。
- 字段携带 `value/source/confirmedAt`；unknown / inferred 原样保留。修改当前档案不修改旧快照，长期偏好必须有独立明确用户动作。保存与快照捕获检查 `expectedRevision`。
- App 可创建、列出和重新打开本人的历程；进度和 `allowedActions` 由事实投影，写命令仍重新校验。缺照片、候选或 Visit 的历程明确缺少证据，不能预建占位实体或评为 complete。
- 验收包括快照不变、并发两设备修改冲突、跨 owner / journey 关联拒绝、列表上限和旧内容版本解码。

### feat-007：私有素材与首个持久化清理任务

- 打通 App 选图 → `PrepareUpload` → 实际本地测试对象上传 → `CompleteUpload` → 用途受限访问 → 档案 / 历程引用。服务端验证真实 MIME、大小、解码尺寸、校验和、方向与无关 EXIF；客户端完成通知不能直接使素材 available。
- 只有 media 操作用户对象，其他模块只持 assetId。业务引用与 `RegisterAssetUsage` 同事务，共享档案素材仅在同 owner 且用途许可时引用。
- 以实际删除为消费者接入 pg-boss、`TaskPort` 和 `ContinueDeletion.v1`。素材 / 历程 / 账号所有者先设置屏障并同事务入队，使用独立于测试数据库回滚的本地恢复清单适配器验证顺序，再推进当前已实现所有者的清理。后续每增加一个模块，同步增加其公开清理步骤。
- 验收包括未上传 / 伪装文件拒绝、其他用户签名拒绝、删除后新访问拒绝、共享素材不误删、job 回滚、清单失败保持 pending、幂等重复清理。测试用非个人合成素材；真实 OSS 和真实照片由 feat-015 的门槛控制。

### feat-008：单顾问的持久化轮次

- `POST /journeys/:id/turns` 将用户消息、附件 usage、AiRun、消息运行关联和 `RunConsultationTurn.v1` 同事务提交，返回 202；App 通过 `/runs/:id` 查询、暂停后台轮询和恢复查看。
- 实现受限 Runtime、最小 ContextBuilder、静态工具表和 Fake AdvisorModelPort。首次只注册已有消费者的能力，如读取当前历程；推荐、Brief、模拟和反馈工具随对应切片加入。
- 每次模型调用有 Attempt、执行权版本和服务端周期 / 用户周期 / advisor_run 预算；结构修正同样计入回合、截止和费用上限。未知成本上限不派发，SDK / HTTP 与付费 job 的自动重试均关闭。
- 写工具与 ToolCheckpoint 原子提交；最终助手结果与 CompleteRun 原子提交。等待用户时保存提议并释放 worker，新回答新建关联轮次。重复消费、queued 超期、回合间宕机、dispatched 后失联和旧执行权均有行为用例。

### feat-009：推荐与方案版本

- 维护经过审阅、有 sourceRef 的最小 Hairstyle 种子资料；不建立爬虫、向量库或内容后台。顾问经 `search_hairstyles`、`save_recommendation_draft` 的叶子工作流保存候选。
- 推荐绑定明确 ProfileSnapshot、AiRun 和候选 versionId，展示理由、主要变化、维护取舍、硬限制冲突及关键未知；模型结构合法仍须领域校验。
- `AppendPlanVersion` 追加版本，`POST /plans/:id/versions` 使用 baseVersionId / expectedRevision。来源区分用户显式修改与 AI 草稿，不能篡改已确认条件或自动最终选定。
- 验收包括无来源 / 快照错配拒绝、硬限制冲突、未知不猜填、重复工具不重复保存、并发追加和历史版本仍可精确读取。

### feat-010：基准模拟执行

- 用户通过独立 API 确认明确 planVersionId / assetId / baseline、次数、费用、期限及用途；`ConfirmGenerationGrant` / `RevokeGenerationGrant` 不能由模型调用替代。
- 按 MODULES §5.2 实现 Simulation → Run / Attempt → 全部预算预留 → BindAttempt → job 的同 PG 事务。所有适用作用域和 cost / image_count 维度全部成功才提交，MVP 单请求一图。
- 派发前即时签发输入访问，再按统一锁序重新检查并 CAS `prepared → dispatched`；提交后只调用一次 Fake ImageEditPort。收到结果后记录 Attempt / 用量与当前 Simulation 映射，media 转存同一结果，最终挂接与 Run 完成原子提交。
- 覆盖 dispatched 后失联、未知结果保守核对、转存失败仅重试同一结果、过期终止、并发新尝试、旧结果晚到、撤销 / 删除与派发 / 挂接竞态。所有者清理与有界恢复查询随本切片扩展。
- 用户明确接受旧调用可能已计费且仍有余量，才可建立新 Attempt；旧结果不能覆盖新 current 指针或用户选择。此阶段 ready 仍为 pending_review，不作为有效比较或真实质量通过。

### feat-011：质量、比较与选择

- 实现 `ReviewSimulationOutput`、`SelectSimulationOutput`、`RecordComparison`、`SelectPlan`；质量记录来自真实用户或受控维护检查，不能由 LLM 自评设 accepted。
- App 展示原图 / 输出、对应版本及检查项：身份、主要发型要求、非发型要素、输入来源。rejected 图不计有效比较，仍保留发生过的使用量。
- 同一历程至少一次 accepted baseline 的实际用户比较才有有效证据。最终选中未模拟的版本允许继续，但明确标识，不能借用别的版本图片。跳过模拟继续是降级路径。
- 验收包括“HTTP 200 / 图片 ready ≠ accepted / 已比较”、旧版本错配、跨历程证据、并发改选、旧输出晚到不自动选中。

### feat-012：Brief 与现场材料

- `SaveBriefDraft` 只消费具体 PlanVersion 及其绑定的 ProfileSnapshot，结合已核实材料；新档案条件应先产生新方案版本，不能拼接旧方案与新快照。
- 内容包含摘要、分区目标、保留 / 禁止事项、维护和现场待核实项；unknown 保留，不编造精确厘米、剪切角度或化学配方。用户独立确认具体 BriefRevision，事务内保护当前 Selection 和 Brief revision。
- App 使用 `BriefView` 固定模板、转义文字和已授权本地化图片，提供离线查看及本地 PDF / 用户主动分享。只有真实查看 / 保存 / 导出完成回执才记交付；失败或取消不写成功证据，补传回执幂等。
- 验收包括并发改选不能确认旧草稿、旧版材料标识、素材已删除提示、只导出用户所选材料、无网络现场可读、登出清缓存。原生 PDF / 分享须在选定设备实际验证；浏览器执行或 Fake DeviceExportPort 不代替设备验收。

### feat-013：实际理发与复盘

- `RecordVisit` 保存实际出示的 BriefRevision、原目标、现场约定、执行事实及当时私人 Stylist / Salon 快照。允许未知执行者；PATCH 追加 VisitRevision，保留操作者、来源和 supersedesId。
- `RecordFeedback` 分开保存 after_cut / after_self_styling 的体验时间与记录时间；纠正追加修订。顾问代录必须绑定真实用户消息，不填用户未表达的评分、不据模型猜测创建 Visit。
- `AssessJourney` 通过各所有者公开事实、同一 visitId / shownBriefRevisionId、两类反馈及读取修订指纹形成版本化评估。无 Visit 返回 incomplete；闭环、关闭、图片质量、满意度分别计算。
- 验收包括 A 次理发材料与 B 次反馈无法拼成 complete、体验早于理发拒绝、旧评估依据不变、无 Brief / 缺自行打理反馈降级或未完成、完整但不满意仍可 complete。

### feat-014：完整 Fake 链路与恢复收口

- 从实际 App 入口贯通六步业务链路到真实 API / worker / PG，只有外部 Provider 使用 Fake，记录各阶段可观察结果。保留无有效图、未取得 Brief、未理发、缺反馈等负例。
- 汇总所有者已实现的清理步骤，复核十模块范围、未挂接对象、跨历程共享素材、幂等 tombstone、晚到窗口和独立恢复清单。注入清单不可用、清理中断和业务库恢复：未重施屏障并核验前不得开放恢复库。
- 完成业务日志脱敏、具名恢复候选和告警行为测试；按已有窗口恢复 queued / prepared / dispatched、顾问回合间、转存与删除，禁止把扫描变成重新生成入口。
- 在 journeys 落实 PilotEnrollment / 汇总的确定性规则：固定五人、各自 28 天窗口、发起人不入分母、三种比例与缺失分类；测试只用非个人记录，不邀请真实参与者。
- 全量自动检查通过才完成此 Fake 里程碑；仍未证明真实模型质量、原生设备、真实理发或试点价值。

### feat-015：真实能力与最大风险评测

- 可以在 feat-010 后优先选择本切片，以尽早检验模型效果风险；前提是账号、地域、样例用途、具体张数 / 成本硬上限、结果处理及保留条件已获明确授权。未满足时继续可独立推进的本地切片，不调用真实服务。
- 沿用现有国内候选的 AdvisorModelPort / ImageEditPort 及 OSS 适配位置，接入前重新核实型号、能力与接口限制；候选文档不是当前供应商事实证明。先做离线契约样例与标准错误映射，再进行授权样例评测。
- ProviderResultFetcher 验证 HTTPS、允许来源、实际解析地址、每次重定向、MIME、大小和期限。明确临时结果 URL 的实际供应商边界，转存后私有访问，locator 不进入公开契约和日志。
- 记录能力声明、模型 / recipe / policy 版本、人工质量检查、实际 / 估算 / 不明用量、等待及失败分类。实际不支持的查询 / 幂等 / 取消保持关闭，无静默地区或供应商 fallback。质量门槛未达时报告结果，不冒充接入验收成功。

### feat-016：设备、真实环境与运维验收

- 在用户确定的平台和分发方式上验证安装、照片权限、会话恢复 / 登录回调 / 真实找回、后台任务续接、离线 Brief / PDF、分享取消、切换用户清缓存与真实网络故障。
- 先完成可审查的环境配置、受控增量迁移、同版本 API / worker、HTTPS / 私网边界、Secret 注入、日志与告警、数据库 / 对象备份及独立恢复清单验证。部署或采购只有明确授权后才执行，模板完成不等于已经部署。
- 确认服务 / 用户 / 单次额度、并发、等待与不明核对窗口，live 缺上限拒绝启用；production 不可使用 Fake 冒充真实结果。恢复演练分别验证数据库、对象和删除清单，不恢复已删私人内容。
- 同一验收版本完成自动回归、真实设备与真实服务证据；所需平台或外部环境缺失时保留未完成状态。

### feat-017：真实理发与试点评估

- 发起人先完成真实理发及首次自行打理反馈，不计入后续五人分母。技术验收和至少一人真实全链路均通过，才能称核心闭环真实跑通。
- 经试点授权后记录五名参与者各自创建历程起的 28 天窗口。目标为至少 3/5 完整完成；完成者至少两人同时说明具体帮助且首次自行打理满意度 ≥4/5。
- 同时报告完整人数 / 5、满足价值条件人数 / 5、满足价值条件人数 / 完成人数。放弃、失败、未理发、未出示、未回访保留分类；窗口外结果另列。删除隐私优先，仅按已同意且不可回溯个人的口径保留必要统计。
- 记录达成与未达成结果，不用 Fake、截图或新功能替代真实观察；目标未达不宣称 V1 试点成功。参与邀请、对外联系、个人资料和真实照片处理均需相应授权，不能因本计划自动执行。

## 4. 数据落地与归属

以下按 ARCHITECTURE §5、MODULES §4 / §7 分组，表示首个消费者和关键不变量，不强制每个概念独立建表。表定义由所属模块维护，集中迁移负责跨域外键装配；不通过跨域 CASCADE 绕过所有者清理命令。

| 所有者 | 数据与关键引用 | 最早落地及演进 |
| --- | --- | --- |
| identity | User、identityRef、accountState、ConsentRecord、可信 UserActionRef、账号屏障 / 删除检查点 | 005 身份 / 同意；007 清理；后续出站消费者重查 |
| profiles | HairProfile 字段来源与 revision；不可变 HairProfileSnapshot / schemaVersion；照片只持 assetId | 006 文字与快照；007 素材关联 |
| journeys | HairJourney(ownerId / goal / lifecycle / revision)、PlanSelection、JourneyEvidence、GoldenPathAssessment、PilotEnrollment、历程清理检查点 | 006 历程；011 比较 / 选择；012 交付；013 评估；014 试点规则 |
| styling | 公共 Hairstyle / sourceRef；Recommendation(profileSnapshotId / aiRunId)、候选关联；StylePlan / StylePlanVersion | 009；versionId 始终指向具体 owner / journey / snapshot |
| simulations | Simulation 的固定输入、planVersionId、currentRunId / currentAttemptId；Output(assetId / attemptId)、QualityReview | 010 执行；011 质量 / 选图 |
| briefs | HaircutBrief、BriefRevision(planVersionId / contentSchemaVersion / supersedesId)、材料和用户确认 | 012；交付证据归 journeys，本地文件归设备边缘 |
| haircuts | HaircutVisit / VisitRevision(shownBriefRevisionId / 来源 / 时间)、Feedback 修订、私人 Stylist / Salon 快照 | 013；不同 Visit 不拼接，不静默更新历史 |
| media | MediaAsset(purpose / locator / checksum / MIME / 尺寸 / lifecycle)、AssetUsage、导入及对象清理检查点 | 007 上传 / 清理；010 Provider 结果转存；locator 私有 |
| consultations | Consultation、用户 / 助手 Message、DraftProposal、有原始消息范围的辅助摘要 | 008；原话 / 推断来源分开，摘要不是结构化事实 |
| ai-operations | AiRun、ModelAttempt、ToolCheckpoint、UsageBudget / Reservation / Record、GenerationGrant | 008 顾问预算 / Attempt；010 图片 Grant 与 cost / image_count |

共同数据库约束：

- 个人引用校验 owner / journey / id，不能只靠 UUID 存在。`UNIQUE(plan_id, version_no)`、`UNIQUE(brief_id, revision_no)` 和修订 CAS 保护版本。
- 业务请求使用 `(actor_id, operation, idempotency_key)` + 规范化摘要；同键异内容 409，返回旧结果前重查访问与删除屏障。工具自然键 `(runId, toolCallId)`，导入自然键 `(attemptId, outputIndex)`，预留唯一键 `(attemptId, budgetId)`。
- 金额使用整数最小单位或精确 decimal，保存 currency、计价版本及 actual / estimated / unknown；多作用域限额不构成多次计费。时间使用 UTC，实际理发日期 / 用户时区与记录时间分别表达。
- 关系字段保存所有权、引用、状态、预算及时间；描述性内容使用所属模块解析的版本化 JSONB。数据库、内容、HTTP 和队列消息版本分别管理。
- 迁移仅追加：expand → 可重复 backfill → 切换读取 / 写入 → 后续 contract。测试首批迁移及后续旧格式解码；存在上一已发布格式时必须保留对应回归，不用新 Prompt 重新生成历史。

## 5. 必须随切片验证的原子组

| 触发 | 同一真实 PG 事务内 | 事务外及失败语义 |
| --- | --- | --- |
| 档案 / 资源引用 | 本域条件写、幂等记录、media.RegisterAssetUsage | 外层 commit 后才返回提交成功 |
| 开始顾问轮次 | AppendUserTurn、附件 usage、CreateRun、LinkTurnRun、pg-boss job | Runtime / 模型之后执行；不暴露半条消息运行关联 |
| 写工具 / 结束轮次 | 叶子领域写 + ToolCheckpoint；最终 SaveAssistantOutcome + CompleteRun | 等用户时退出 worker，新轮次不重演旧工具 |
| 申请图片 / 显式再尝试 | 幂等、Simulation、Run、Attempt、全部预算预留、BindAttempt、job | 不在事务内生成图片，任一步失败整体回滚 |
| 派发 | 所有者屏障检查 / 锁、执行权、CAS dispatched、Simulation generating | commit 后单次出站；commit 后宕机仍可能 outcome_unknown |
| 结果观察 / 最终挂接 | Attempt 观察 / 用量及 Run / 当前 Simulation 映射；挂接时 FinalizeImportedAsset、AttachSimulationOutput、usage、CompleteRun | 下载 / 对象写入在两笔短事务之间；失败只恢复同一结果，晚到只清理或保留正确旧归属 |
| Brief 确认 | 当前 Selection revision 保护 + 指定 Brief revision 确认 + 用户动作 / 幂等 | 本地渲染 / 导出随后执行，无成功回执不记交付 |
| Visit / 反馈 / 评估 | 修订追加、current 指针、usage / 幂等；评估采用一致快照或版本指纹复查 | 错误不改旧 Brief 或旧评估，跨 Visit 缺证据不算 complete |
| 删除 / 撤销 | 所属模块屏障及必要清理 job / 检查点 | 独立清单可靠登记后物理清理；失败 pending，恢复重施屏障后才开放读写 |

全路径统一锁序为 **User → Journey（适用时）→ Consent → Grant（图片时）→ 按稳定 ID 排序的 Asset → Simulation（图片时）→ 执行 / 预算行**。同类型按稳定 ID 排序，不需要的类可跳过，不能逆序新取锁。检查经各所有者公开接口完成；新尝试先锁现有 Simulation 再预留预算。仅结算可只锁执行 / 预算，之后不得逆向取 Grant 或 User。普通查询得到的事实不构成派发许可。

Grant 自然到期阻止新派发；已合法派发的结果按当次授权快照完成，但后续撤销和删除优先。已经签发的短时链接及已派发外部请求有在途窗口，不承诺即时撤回、免费取消或端到端 exactly-once。

## 6. 约束映射与测试落点

以根目录[约束映射](./architecture-constraints.json)为机器可检查的入口。下表的文件为计划落点，尚未创建；具体名字可随切片调整，但必须同步映射。一个 pending 组跨多个切片时，在首次实现处拆成可分别验证的子约束并保留出处，已实现部分配 checks，未实现部分保留 pending，不能只刷新文档摘要或整组提前宣称通过。

| 约束 ID | 触发切片 | 主要自动化落点与拒绝用例 |
| --- | --- | --- |
| IDENTITY、PRIVATE-CLIENT | 005 起，每个私人 / App 消费者持续补齐 | `tests/integration/identity.test.ts`、`tests/e2e/private-client.spec.ts`；伪造确认、跨用户、会话失效、切换缓存 |
| DATA-OWNERSHIP、SCHEMA-EVOLUTION | 005 首批表起 | `tests/architecture/table-ownership.test.ts`、`tests/integration/owner-constraints.test.ts`、`migrations.test.ts`、`tests/contracts/backward-compatibility.test.ts`；他域表、错 owner、旧格式 / 迁移失败 |
| PROFILES | 006、007、009、012 | `tests/unit/profiles.test.ts`、`tests/integration/profiles.test.ts`；unknown 升级、快照覆写、Brief 换依据 |
| JOURNEYS | 006、011–014 | `tests/unit/journeys.test.ts`、`tests/integration/journeys.test.ts`；错误版本 / Visit、无交付、试点改分母 |
| MEDIA | 007、010、015 | `tests/integration/media.test.ts`、`tests/architecture/media-ownership.test.ts`；伪装上传、非法对象操作、SSRF、重复转存 |
| ATOMIC-TASKS | 007 清理；008 / 010 执行与工具 | `tests/integration/atomic-tasks.test.ts`；真实 PG 注入失败使业务 / 预算 / job / 检查点整体回滚 |
| CONSULTATIONS、AI-OPERATIONS、RUNTIME-PROVIDERS | 008 起；010 图片；015 真实 Adapter | 对应 unit / integration 模块测试、`tests/unit/runtime.test.ts`、`tests/contracts/providers.test.ts`、`tests/integration/execution-recovery.test.ts`；越权工具、超限、重复派发、旧执行权、无限回合 |
| STYLING | 009 | `tests/unit/styling.test.ts`、`tests/integration/styling.test.ts`；来源缺失、硬限制冲突、错误快照 |
| SIMULATIONS | 010、011 | `tests/unit/simulations.test.ts`、`tests/integration/simulations.test.ts`；current CAS、旧结果晚到、ready 被当作 accepted |
| BRIEFS | 012 | `tests/unit/briefs.test.ts`、`tests/integration/briefs.test.ts`、`tests/e2e/brief-delivery.spec.ts`；换快照、改选竞态、导出失败冒充成功 |
| HAIRCUTS | 013 | `tests/unit/haircuts.test.ts`、`tests/integration/haircuts.test.ts`；修订覆盖、伪造代录、体验时间错误 |
| DELETION-RECOVERY | 007 起各所有者随建随补；010 竞态；014 / 016 恢复复核 | `tests/integration/deletion-races.test.ts`、`backup-recovery.test.ts`；清单失败、删除后挂接、备份恢复复活 |
| OPERATIONS-LIVE | 008 起日志；014 Fake；015–017 真实验证 | `tests/integration/observability.test.ts`、`tests/golden-path/fake-journey.test.ts`；敏感日志、告警漏发、六步缺证据；真实样例与试点另记 |
| FUTURE-BOUNDARY | 当前不启用 | 持续执行 BASE-01；只有新范围批准后才增加 `tests/architecture/capability-registration.test.ts`，不预建 Reserved 实现 |

BASE-01–11 随所有切片继续运行，新增源码、依赖闭包和实际客户端产物必须纳入检查。静态规则要同时有合法与最小违规样例，覆盖别名、重导出、动态导入和错误退出；业务权限、状态、锁序、预算及回滚使用行为测试。

## 7. 每个切片的完成门槛

1. 开始前确认用户授权、依赖完成、相关章节、文件范围、正反例和本次未验证项；将唯一活动 feature 与 activeFeatureId 对齐。
2. 应用切片实际通过 `pnpm run lint`、`pnpm run typecheck`、`pnpm run test:unit`、`pnpm run test:integration`、`pnpm run test:contracts`、`pnpm run test:architecture`、`pnpm run build`。表中业务切片影响 App / API / worker 或跨模块，另须 `pnpm run test:e2e`；完整入口为 `./init.sh --app`，首错退出。
3. 层级 1 覆盖规则、正常 / 异常、权限和边界；层级 2 使用隔离真实 PG 验证协作、持久化、回滚和并发；层级 3 从实际用户入口贯通，只有外部 Provider 可 Fake。`tests/golden-path/` 的有效用例须接入真实检查命令，不能只创建目录或不被 runner 收集的测试。
4. 按各切片要求补充原生设备、实际服务或真实试用证据。自动化通过和人工验证分别记录；没有原生 PDF、真实质量或真实理发证据，不能宣称相应能力完成。未执行、缺环境、零用例、skip / todo 或失败均不算通过。
5. 逐层 evidence 记录日期、命令、退出码、有效用例、覆盖范围与未验证项；同步约束映射。应用变更若认为层级 3 不适用，必须说明调用链未跨组件的依据，不能只按文件数判断。
6. 完成 diff / 边界复核、`git diff --check` 与 `git status --short`，再同步 feature_list、progress 和 session-handoff。缺必需证据保持 in-progress / blocked，不能为了全绿放松测试或连接非隔离库。

本轮 feat-004 是文档 / harness 与验证工具路径修复，不修改应用实现、公开 Schema 或组件交互。其验收为 harness、引用有效性、同源 OpenAPI 和受影响架构 / 静态检查；不据此宣称应用三级测试或业务功能已完成。

## 8. 开放决策与停止位置

| 决策 | 最迟明确时间 | 未明确时可继续的工作 |
| --- | --- | --- |
| 首批 iOS / Android 设备与分发方式 | feat-012 原生导出验收前；feat-016 安装 / 分发前 | 平台无关内容、API、确定性行为和已有浏览器测试；设备证据保持未验证 |
| 实际登录方式、找回与邮件通道 | feat-005 具体认证适配实施时核实；真实用户接入前锁定 | AuthPort、身份映射 / 所有权规则、本地隔离验证；不自行新增短信 / 微信产品范围 |
| 供应商 / 地域 / 型号、能力与样例处理用途 | feat-015 外部调用前 | Fake 执行、离线契约和受控样例评测准备 |
| 次数 / 成本 / 并发 / 超时 / 不明核对窗口 | 任何真实计费调用前，包括样例和免费试用 | 确定性预算、状态机和 Fake 故障注入；不能以试用为由无上限调用 |
| 供应商临时输出、私有存储、备份与删除期限 | 真实照片进入任一 Provider / 存储前 | 本地非个人素材、清理与恢复清单测试 |
| 真实生活照片模拟规格 | 若要纳入某次发布前另行确认 | 保留 simulations 的边界说明；当前只注册 baseline，不固定其未来版本时间 |

最大模型风险应在真实调用前置条件具备后尽早验证，feat-015 因此不依赖整条 Fake 产品链完成。提前实验仍须单独确定本次切片、用途与额度，不豁免派发、预算、隐私和失败恢复规则。

当前不实现地图、产品通知、支付 / 预约、商家后台、匹配 / 排名、即时聊天、社区、AR、多 Agent、文本新场景、自动长期偏好学习、用户 Web 产品或通用平台。未来范围变化先确认产品要求，再更新架构与约束测试。

下一安全动作：复核本计划后，在新的业务开发授权下选择 feat-005，先恢复指定工具和隔离测试基线，落实身份与迁移的最小消费者。计划登记本身不启动该 feature。
