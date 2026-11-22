# 项目备注

Windows 桌面工具，可浏览本地目录、编辑文件和文件夹备注，并通过配置的模型生成候选备注。文件夹备注可以显示在资源管理器的「备注」列。

## 安装

从仓库的 Releases 下载 `ProjectNotes-Setup-*-x64.exe`。安装包适用于 Windows 10 1809 及更新版本的 x64 系统。运行需要 .NET Framework 4.6.2 或更新版本，以及 Microsoft Edge WebView2 Runtime。

模型配置和文件备注保存在当前 Windows 用户的本地应用数据目录。安装到当前用户的 `Programs` 目录，开始菜单中的「项目备注」可启动应用。

## 构建与发布

- 在 Windows x64 上安装 Node.js 24 和 Inno Setup 6。
- 运行 `./build.ps1`，便携版程序位于 `bin/ProjectNotes.exe`。
- 运行 `./package.ps1`，安装包和 SHA-256 校验文件位于 `dist/`。
- 更新 `package.json` 和 `package-lock.json` 中的版本，提交源代码后推送同版本的 `v<版本号>` 标签。GitHub Actions 会构建并发布安装包。
