# HairMate

Expo / React Native App、Fastify API 与独立 Node worker 的最小应用基线。当前只提供连接页面和 PostgreSQL 健康检查；业务闭环尚未实现。范围、版本和验证说明见 [工程基线](./engineering-baseline.md)，后续开发从 [AGENTS.md](./AGENTS.md) 开始；切片顺序、数据归属和验收门槛见 [开发计划](./PLAN.md)。

先准备 Node **22.23.2**、pnpm **10.33.4** 和 Docker，再运行：

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium --only-shell
docker compose -f infra/compose.test.yaml up -d --wait
export APP_ENV=test
export TEST_DATABASE_URL=postgresql://hairmate_test@127.0.0.1:55432/hairmate_test
./init.sh --app
```

`./init.sh --app` 按顺序执行 harness、七项基础检查和 E2E，首个失败即退出；不安装依赖、不读取 `.env`、不启动数据库、不迁移。缺少隔离测试库或匹配浏览器即失败。`--harness-only` 只能证明协作文件检查通过。

本地开发可以分别在三个终端启动：

```bash
APP_ENV=development DATABASE_URL=postgresql://hairmate_test@127.0.0.1:55432/hairmate_test pnpm run dev:api
APP_ENV=development DATABASE_URL=postgresql://hairmate_test@127.0.0.1:55432/hairmate_test pnpm run dev:worker
EXPO_PUBLIC_API_URL=http://localhost:3000 pnpm run dev:mobile
```

App 的地址必须能被运行它的设备访问；手机的 localhost 指向手机本身。真机局域网调试时为 API 显式设置 `API_HOST=0.0.0.0`，并将公开 API 地址改为开发电脑的局域网地址。默认 Fake / 本地模式，当前 production / live / OSS 模式会拒绝启动。

用完测试数据库后执行 `docker compose -f infra/compose.test.yaml down`；它只移除此测试容器及其临时数据。不要把测试 Compose 配置用于生产。具体命令结果和未验证项见 [progress.md](./progress.md)。
