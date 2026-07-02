import { Eye, EyeOff, FolderPlus, RefreshCw, Save, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SkillConfig, SkillsApiResponse, SkillViewRecord } from "./shared/types";

type SourceFilter = "all" | "codex" | "plugin" | "custom";

const emptyConfig: SkillConfig = {
  extraScanPaths: [],
  overrides: {},
  customEntries: []
};

export default function App() {
  const [skills, setSkills] = useState<SkillViewRecord[]>([]);
  const [config, setConfig] = useState<SkillConfig>(emptyConfig);
  const [errors, setErrors] = useState<Array<{ path: string; message: string }>>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [showHidden, setShowHidden] = useState(false);
  const [status, setStatus] = useState("正在读取本机技能...");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [hidden, setHidden] = useState(false);
  const [importPath, setImportPath] = useState("");

  async function loadSkills(nextSelectedId = selectedId) {
    setStatus("正在刷新技能列表...");
    const response = await fetch("/api/skills");
    if (!response.ok) {
      throw new Error(`读取技能失败: ${response.status}`);
    }
    const data = (await response.json()) as SkillsApiResponse;
    setSkills(data.skills);
    setConfig(data.config);
    setErrors(data.errors);
    const selectedStillExists = data.skills.some((skill) => skill.id === nextSelectedId);
    setSelectedId(selectedStillExists ? nextSelectedId : data.skills[0]?.id ?? "");
    setStatus(`已读取 ${data.skills.length} 个技能`);
  }

  useEffect(() => {
    loadSkills("").catch((error) => setStatus(error instanceof Error ? error.message : String(error)));
  }, []);

  const selectedSkill = skills.find((skill) => skill.id === selectedId);

  useEffect(() => {
    setNote(selectedSkill?.override.note ?? "");
    setCategory(selectedSkill?.override.category ?? "");
    setHidden(Boolean(selectedSkill?.override.hidden));
  }, [selectedSkill?.id]);

  const filteredSkills = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return skills.filter((skill) => {
      const override = skill.override;
      if (!showHidden && override.hidden) {
        return false;
      }
      if (sourceFilter !== "all" && skill.sourceType !== sourceFilter) {
        return false;
      }
      const haystack = `${skill.name} ${skill.description} ${override.category ?? ""} ${override.note ?? ""}`.toLowerCase();
      return !normalizedQuery || haystack.includes(normalizedQuery);
    });
  }, [skills, query, sourceFilter, showHidden]);

  const sourceCounts = useMemo(() => {
    return skills.reduce(
      (counts, skill) => {
        counts[skill.sourceType] += 1;
        return counts;
      },
      { codex: 0, plugin: 0, custom: 0 }
    );
  }, [skills]);

  async function saveSelectedOverride() {
    if (!selectedSkill) {
      return;
    }
    setStatus("正在保存修改...");
    const response = await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        overrides: {
          [selectedSkill.id]: {
            note,
            category,
            hidden
          }
        }
      })
    });
    if (!response.ok) {
      setStatus(`保存失败: ${response.status}`);
      return;
    }
    const nextConfig = (await response.json()) as SkillConfig;
    setConfig(nextConfig);
    setSkills((current) =>
      current.map((skill) =>
        skill.id === selectedSkill.id
          ? { ...skill, override: nextConfig.overrides[selectedSkill.id] ?? {} }
          : skill
      )
    );
    setStatus("已保存");
  }

  async function importLocalPath() {
    if (!importPath.trim()) {
      setStatus("请输入本地技能目录");
      return;
    }
    setStatus("正在添加本地目录...");
    const response = await fetch("/api/import/local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: importPath.trim() })
    });
    const body = await response.json();
    if (!response.ok) {
      setStatus(body.message ?? "添加失败");
      return;
    }
    setConfig(body);
    setImportPath("");
    await loadSkills(selectedId);
  }

  return (
    <main className="app-shell">
      <section className="toolbar" aria-label="工具栏">
        <div>
          <h1>Codex 技能</h1>
          <p>{status}</p>
        </div>
        <div className="toolbar-actions">
          <span>Codex {sourceCounts.codex}</span>
          <span>插件 {sourceCounts.plugin}</span>
          <span>自定义 {sourceCounts.custom}</span>
          <button type="button" onClick={() => loadSkills(selectedId)} title="重新扫描技能目录">
            <RefreshCw size={16} />
            刷新
          </button>
        </div>
      </section>

      <section className="workspace">
        <aside className="skill-sidebar" aria-label="技能列表">
          <label className="search-box">
            <Search size={16} />
            <span className="sr-only">搜索技能</span>
            <input
              aria-label="搜索技能"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索名称、说明、备注"
            />
          </label>

          <div className="filter-row">
            <select
              aria-label="来源筛选"
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
            >
              <option value="all">全部来源</option>
              <option value="codex">Codex</option>
              <option value="plugin">插件</option>
              <option value="custom">自定义</option>
            </select>
            <button
              type="button"
              className={showHidden ? "toggle active" : "toggle"}
              onClick={() => setShowHidden((value) => !value)}
              title="显示或隐藏已隐藏技能"
            >
              {showHidden ? <Eye size={16} /> : <EyeOff size={16} />}
              隐藏
            </button>
          </div>

          <div className="skill-list">
            {filteredSkills.map((skill) => (
              <button
                type="button"
                key={skill.id}
                className={skill.id === selectedId ? "skill-row selected" : "skill-row"}
                onClick={() => setSelectedId(skill.id)}
              >
                <span className="skill-title">{skill.name}</span>
                <span className="skill-description">{skill.description || "无说明"}</span>
                <span className="skill-meta">
                  {sourceLabel(skill.sourceType)}
                  {skill.override.category ? ` · ${skill.override.category}` : ""}
                  {skill.override.note ? " · 有备注" : ""}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="skill-detail" aria-label="技能详情">
          {selectedSkill ? (
            <>
              <header className="detail-header">
                <div>
                  <h2>{selectedSkill.name}</h2>
                  <p>{selectedSkill.description || "这个技能没有写 description。"}</p>
                </div>
                <span className={`source-pill ${selectedSkill.sourceType}`}>{sourceLabel(selectedSkill.sourceType)}</span>
              </header>

              <dl className="meta-grid">
                <div>
                  <dt>技能文件</dt>
                  <dd>{selectedSkill.skillFile}</dd>
                </div>
                <div>
                  <dt>来源目录</dt>
                  <dd>{selectedSkill.sourceRoot}</dd>
                </div>
              </dl>

              <div className="edit-grid">
                <label>
                  分类
                  <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="例如：研究、写作、浏览器" />
                </label>
                <label>
                  备注
                  <input aria-label="备注" value={note} onChange={(event) => setNote(event.target.value)} placeholder="这个技能适合什么时候用" />
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={hidden} onChange={(event) => setHidden(event.target.checked)} />
                  从默认列表隐藏
                </label>
                <button type="button" onClick={saveSelectedOverride}>
                  <Save size={16} />
                  保存修改
                </button>
              </div>

              <section className="markdown-panel">
                <h3>SKILL.md</h3>
                <pre>{selectedSkill.markdown}</pre>
              </section>
            </>
          ) : (
            <div className="empty-state">没有可显示的技能。</div>
          )}
        </section>

        <aside className="management-panel" aria-label="管理功能">
          <section>
            <h2>本地目录</h2>
            <p>添加一个包含 SKILL.md 的目录，刷新后会作为自定义技能显示。</p>
            <label>
              技能目录
              <input value={importPath} onChange={(event) => setImportPath(event.target.value)} placeholder="/path/to/skill" />
            </label>
            <button type="button" onClick={importLocalPath}>
              <FolderPlus size={16} />
              添加目录
            </button>
          </section>

          <section>
            <h2>额外扫描</h2>
            {config.extraScanPaths.length ? (
              <ul className="path-list">
                {config.extraScanPaths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>还没有额外扫描目录。</p>
            )}
          </section>

          <section>
            <h2>扫描提醒</h2>
            {errors.length ? (
              <ul className="error-list">
                {errors.map((error) => (
                  <li key={`${error.path}-${error.message}`}>
                    <strong>{error.path}</strong>
                    <span>{error.message}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>当前没有扫描错误。</p>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}

function sourceLabel(sourceType: SkillViewRecord["sourceType"]) {
  if (sourceType === "plugin") {
    return "插件";
  }
  if (sourceType === "custom") {
    return "自定义";
  }
  return "Codex";
}
