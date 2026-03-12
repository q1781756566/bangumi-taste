# Bangumi 品味分析器

[English](./README.md)

基于 AI 的 [Bangumi](https://bgm.tv) 用户品味分析工具。读取你的动画/游戏收藏数据，通过大语言模型生成一份专属的品味报告。

**在线体验：** https://q1781756566.github.io/bangumi-taste/

## 功能

- **收藏数据获取** — 通过用户名或 Access Token 拉取 Bangumi 动画、游戏收藏
- **AI 品味分析** — 支持 Claude / OpenAI / 自定义 LLM 服务商，生成个性化品味报告
- **可视化图表** — 类型偏好雷达图、评分分布柱状图、收藏状态饼图、活跃时间线
- **品味标签** — 自动生成品味特征标签（如「叙事控」「美学派」）
- **冷门佳作与推荐** — 发掘收藏中被低估的作品，推荐可能喜欢的新作
- **导出为图片** — 一键导出报告为 PNG，附带头像和二维码，方便分享
- **分类选择** — 动画和游戏可独立分析
- **无 API 也能用** — 没有 API 密钥？一键复制 Prompt，粘贴到 ChatGPT / Claude 网页端即可生成文字版报告
- **自动获取模型列表** — 自定义 LLM 服务商可自动拉取可用模型
- **精确评分统计** — 平均分和中位数由前端精确计算，不依赖 LLM 的数学能力
- **结果缓存** — 分析结果本地缓存，再次访问即时加载
- **移动端适配** — 响应式设计，移动端也有良好的浏览体验

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
- LLM API 密钥（Claude、OpenAI 或兼容服务商）— 也可使用「复制 Prompt」功能免密钥体验

### 安装与运行

```bash
git clone https://github.com/q1781756566/bangumi-taste.git
cd bangumi-taste
npm install
npm run dev
```

浏览器打开 http://localhost:3000 即可使用。

### 使用流程

1. 选择分析类别（动画 / 游戏）
2. 输入 Bangumi 数字用户名（可在个人主页 URL 中找到，非昵称）
3. 配置 LLM 服务商和 API 密钥
4. 点击「开始分析」生成品味报告
5. 浏览图表、标签和推荐，可导出为图片分享

## 部署

项目已配置 GitHub Actions 自动部署到 GitHub Pages，推送到 `main` 分支即自动构建发布。

部署到其他平台：

```bash
npm run build
```

静态产物位于 `out/` 目录。

## 许可证

MIT
