# 蓝潮音乐播放器 · Bluewave

一款以青蓝色为主题的本地网页音乐播放器，支持 MP3、FLAC 和 LRC 逐句歌词。

- 原网站：[蓝潮音乐播放器](https://bluewave-music-player.spunky-newt-6083.chatgpt.site)
- 本仓库源自该网站已保存的第 3 版源码（2026 年 8 月），并为开源整理了项目说明及部署配置。它与另一个 [Blue Tide 重建版](https://github.com/BSY26/blue-tide-music-player) 是不同的代码版本。
- 功能包括本地文件导入、播放列表、播放进度和音量调整、随机与循环播放、倍速、上传 LRC 歌词及逐句高亮。音频由浏览器本地读取，FLAC 兼容性取决于浏览器。

## 本地开发

需要 Node.js 22.13 或更新版本，以及 Linux 环境中的 bash、curl、flock 和 GNU timeout。

```bash
npm run install:ci
npm run dev
```

终端会显示本地开发地址。生产构建使用 `npm run build`；`npm test` 会构建并运行现有测试。项目采用 React、Vinext、Vite 和 Cloudflare Workers，不能直接作为纯静态文件部署到 GitHub Pages。

## 目录

- `app/`：播放器界面、逻辑与样式
- `public/`：图标与分享图片
- `worker/`、`build/`：Worker 和构建配置
- `tests/`：现有测试

为避免将此仓库绑定到原网站，公开副本的 `.openai/hosting.json` 已移除原项目标识。部署到新环境时需要按照目标平台重新配置。此仓库包含的是原网站第 3 版源码，其播放中暂停按钮仍使用字符“Ⅱ”；另一个重建版的修复不自动包含在此。

## 许可证

项目代码按 [MIT 许可证](LICENSE)发布；第三方依赖及素材适用各自的许可条款。
