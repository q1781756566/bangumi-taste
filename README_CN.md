# Bangumi 品味分析器

[English](./README.md)

基于 AI 的 [Bangumi](https://bgm.tv) 用户品味分析工具。获取你的动画/游戏收藏数据，通过大语言模型生成个性化的品味报告。

**在线体验：** https://q1781756566.github.io/bangumi-taste/

## 功能特性

- **收藏分析** — 通过用户名或 Access Token 获取 Bangumi 动画和游戏收藏数据
- **AI 品味报告** — 使用 Claude / OpenAI / 自定义 LLM 生成个性化品味分析
- **可视化图表** — 类型偏好雷达图、评分分布柱状图、收藏状态饼图、活跃时间线
- **品味标签** — 生成带描述的品味特征标签（如「叙事控」「美学派」）
- **冷门佳作与推荐** — 发现你的宝藏作品，获取个性化推荐
- **导出为图片** — 将报告导出为 PNG 图片，附带头像、品牌信息和二维码
- **分类选择** — 可单独分析动画、游戏，或同时分析
- **自动获取模型列表** — 自动获取自定义 LLM 服务商的可用模型
- **结果缓存** — 分析结果本地缓存，再次访问即时加载
- **移动端适配** — 完整的响应式设计，针对移动端优化了提示框���图表显示

## 技术栈

- **框架：** Next.js 16 + React 19 + TypeScript
- **样式：** Tailwind CSS v4
- **图表：** Recharts
- **LLM：** Anthropic SDK / OpenAI SDK / 自定义 API
- **导出：** html-to-image + Canvas API + qrcode

## 快速开始

### 环境要求

- Node.js 18+
- Bangumi 账号
- LLM API 密钥（Claude、OpenAI 或兼容服务商）

### 安装与运行

```bash
git clone https://github.com/q1781756566/bangumi-taste.git
cd bangumi-taste
npm install
npm run dev
```

浏览器打开 http://localhost:3000 即可使用。

### 使用方法

1. 选择分析类别（动画 / 游戏）
2. 输入 Bangumi 数字用户名（非昵称）
3. 配置 LLM 服务商和 API 密钥
4. 点击「开始分析」生成品味报告
5. 浏览图表、标签、推荐，并可导出为图片

## 部署

项目已配置 GitHub Actions 自动部署到 GitHub Pages，每次推送到 `main` 分支会自动构建和发布。

其他平台部署：

```bash
npm run build
```

静态产物位于 `out/` 目录。

## 许可证

MIT
