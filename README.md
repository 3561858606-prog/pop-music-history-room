# 大众音乐史复习室

静态网站，可直接用 GitHub Pages 发布（Settings → Pages → Deploy from a branch → `main` / `(root)`）。

- 入口 `index.html` 会跳转到 `_studio/v8-proto/`（当前版本）。
- `.nojekyll` 必须保留，否则 GitHub 会忽略以下划线开头的 `_studio` 文件夹。
- 现有的 `audio/`、`audio-sd/` 和 `course-videos/` 提供前八讲素材。第 9 讲从 [素材仓库](https://github.com/3561858606-prog/pop-music-history-media) 的固定提交读取媒体，地址配置在 `v3/lecture9.js`。曲目和评分依据见 `docs/lecture9-evidence.json`。

学习记录保存在各自浏览器里，并且按网址区分。从旧网址搬过来时，请先在旧网站「历史」页点「导出学习备份」，再在新网站「历史」页点「导入学习备份」（只补上缺少的记录，不会覆盖已有的）。

界面有中文、한국어、English 三种语言（右上角切换；译文在 `_studio/v8-proto/js/i18n-dict.js`，新增界面文字时两份对照都要补）。「?」里有「反馈」页，显示作者联系方式。

第一次打开时会弹出一次上手指南；之后可点顶栏右侧的「?」再看，里面还有「更新」和「小设计」两页。

## 每次更新时

1. 在 `_studio/v8-proto/js/changelog.js` 的 `RELEASES` 最前面加一条：日期、标题，以及新功能（new）／修复（fix）／改进（tweak）各一句话。
2. 有新的细节设计，就加到同一个文件的 `DESIGNS` 里，`since` 写这次的日期，会标「新」。
3. 来过的人下次打开时，左下角会出现一次这条更新的小纸条；新用户只看上手指南，不会被打扰。
