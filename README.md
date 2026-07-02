# Codex Skills Dashboard

本地 Codex 技能管理页，用来查看这台 Mac 上已经安装的 Codex 技能，并保存安全的手动备注。

## 启动

```bash
npm install
npm run dev
```

打开：

```text
http://localhost:5173
```

## 默认扫描目录

- `/Users/cresjq/.codex/skills`
- `/Users/cresjq/.codex/plugins/cache`

页面里的“刷新”会重新扫描这些目录，所以后续新增 Codex 技能后可以同步显示。

## 手动修改

手动备注、分类、隐藏状态、额外扫描目录保存在：

```text
data/skills-config.json
```

第一版不会直接修改原始 `SKILL.md` 文件。

## 支持功能

- 查看本机 Codex 技能列表
- 搜索技能名称、说明、备注和分类
- 按 Codex、插件、自定义来源筛选
- 点击技能查看完整 `SKILL.md`
- 为技能保存备注、分类和隐藏状态
- 添加包含 `SKILL.md` 的本地技能目录作为额外扫描来源
- 显示扫描错误，但不阻断其它技能展示

## 第一版限制

- 不支持 GitHub 安装
- 不支持发布技能
- 不支持在 Codex 运行时启用或禁用技能
- 不支持直接编辑原始 `SKILL.md`
- 不支持卸载技能

## 验证

```bash
npm test
npm run build
```

