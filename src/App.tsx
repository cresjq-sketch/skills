import { Download, Eye, EyeOff, FolderPlus, RefreshCw, Save, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  GitHubPreviewResponse,
  GitHubSkillCandidate,
  SkillConfig,
  SkillsApiResponse,
  SkillViewRecord
} from "./shared/types";

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
  const [displayName, setDisplayName] = useState("");
  const [summary, setSummary] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [hidden, setHidden] = useState(false);
  const [importPath, setImportPath] = useState("");
  const [githubInput, setGithubInput] = useState("");
  const [githubPreview, setGithubPreview] = useState<GitHubPreviewResponse | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");

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
    setDisplayName(selectedSkill?.override.displayName ?? "");
    setSummary(selectedSkill?.override.summary ?? "");
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
            displayName,
            note,
            category,
            summary,
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

  async function previewGitHubInstall() {
    if (!githubInput.trim()) {
      setStatus("请输入 GitHub 仓库地址");
      return;
    }
    setStatus("正在预览 GitHub 技能...");
    const response = await fetch("/api/import/github/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: githubInput.trim() })
    });
    const body = await response.json();
    if (!response.ok) {
      setStatus(body.message ?? "GitHub 预览失败");
      return;
    }
    setGithubPreview(body);
    setSelectedCandidateId(body.autoInstallCandidateId ?? body.candidates[0]?.id ?? "");
    setStatus(`找到 ${body.candidates.length} 个可安装技能`);
  }

  async function installGitHubCandidate() {
    if (!githubPreview || !selectedCandidateId) {
      setStatus("请选择要安装的 GitHub 技能");
      return;
    }
    setStatus("正在安装 GitHub 技能...");
    const response = await fetch("/api/import/github/install", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clonePath: githubPreview.clonePath,
        candidateId: selectedCandidateId
      })
    });
    const body = await response.json();
    if (!response.ok) {
      setStatus(body.message ?? "GitHub 安装失败");
      return;
    }
    setGithubInput("");
    setGithubPreview(null);
    setStatus(`已安装 ${body.installedSkillName}`);
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
                <span className="skill-title">{skill.summary.displayName}</span>
                <span className="skill-description">{skill.summary.summary}</span>
                <span className="skill-meta">
                  {sourceLabel(skill.sourceType)}
                  {skill.summary.category ? ` · ${skill.summary.category}` : ""}
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
                  <h2>{selectedSkill.summary.displayName}</h2>
                  <p>{selectedSkill.name}</p>
                </div>
                <span className={`source-pill ${selectedSkill.sourceType}`}>{sourceLabel(selectedSkill.sourceType)}</span>
              </header>

              <section className="summary-panel">
                <div>
                  <h3>这个技能能做什么</h3>
                  <p>{selectedSkill.summary.summary}</p>
                </div>
                <div>
                  <h3>什么时候会用到</h3>
                  <ul>
                    {selectedSkill.summary.triggerHints.map((hint) => (
                      <li key={hint}>{hint}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>中文分类</h3>
                  <p>{selectedSkill.summary.category}</p>
                </div>
                {selectedSkill.summary.boundaries.length ? (
                  <div>
                    <h3>使用边界</h3>
                    <ul>
                      {selectedSkill.summary.boundaries.map((boundary) => (
                        <li key={boundary}>{boundary}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>

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
                  中文名称
                  <input aria-label="中文名称" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={selectedSkill.name} />
                </label>
                <label>
                  分类
                  <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="例如：研究、写作、浏览器" />
                </label>
                <label className="wide-field">
                  中文摘要
                  <input aria-label="中文摘要" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder={selectedSkill.summary.summary} />
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
                <h3>原始 SKILL.md</h3>
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
            <h2>GitHub 安装</h2>
            <p>支持公开仓库地址、owner/repo，或指向具体技能目录的 tree 链接。</p>
            <label>
              GitHub 仓库
              <input
                aria-label="GitHub 仓库"
                value={githubInput}
                onChange={(event) => setGithubInput(event.target.value)}
                placeholder="owner/repo 或 https://github.com/owner/repo"
              />
            </label>
            <button type="button" onClick={previewGitHubInstall}>
              <Search size={16} />
              预览 GitHub 技能
            </button>
            {githubPreview ? (
              <div className="candidate-list">
                {githubPreview.candidates.map((candidate: GitHubSkillCandidate) => (
                  <label key={candidate.id} className="candidate-row">
                    <input
                      type="radio"
                      name="github-candidate"
                      checked={selectedCandidateId === candidate.id}
                      onChange={() => setSelectedCandidateId(candidate.id)}
                    />
                    <span>
                      <strong>{candidate.name}</strong>
                      <small>{candidate.relativePath}</small>
                    </span>
                  </label>
                ))}
                <button type="button" onClick={installGitHubCandidate}>
                  <Download size={16} />
                  安装选中技能
                </button>
              </div>
            ) : null}
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
