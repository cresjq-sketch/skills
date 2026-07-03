import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App from "./App";

const alpha = {
  id: "alpha-id",
  name: "alpha",
  description: "Alpha desc",
  sourceType: "codex",
  sourceRoot: "/tmp/skills",
  skillDir: "/tmp/skills/alpha",
  skillFile: "/tmp/skills/alpha/SKILL.md",
  markdown: "---\nname: alpha\n---\n# Alpha body",
  metadata: { name: "alpha", description: "Alpha desc" },
  override: {},
  summary: {
    displayName: "alpha",
    category: "搜索调研",
    summary: "适合收集资料、搜索网页、整理外部信息和做主题调研。",
    triggerHints: ["需要查资料、看网页、整理外部信息时"],
    boundaries: []
  }
};

const beta = {
  id: "beta-id",
  name: "beta",
  description: "Beta desc",
  sourceType: "plugin",
  sourceRoot: "/tmp/plugins",
  skillDir: "/tmp/plugins/pkg/skills/beta",
  skillFile: "/tmp/plugins/pkg/skills/beta/SKILL.md",
  markdown: "---\nname: beta\n---\n# Beta body",
  metadata: { name: "beta", description: "Beta desc" },
  override: { note: "Existing note", category: "Research" },
  summary: {
    displayName: "beta",
    category: "Research",
    summary: "适合处理插件技能。",
    triggerHints: ["需要管理技能时"],
    boundaries: ["不负责发布内容"]
  }
};

function mockFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/skills") {
      return jsonResponse({
        skills: [alpha, beta],
        errors: [],
        config: { extraScanPaths: [], overrides: {}, customEntries: [] }
      });
    }
    if (url === "/api/skills/alpha-id") {
      return jsonResponse(alpha);
    }
    if (url === "/api/skills/beta-id") {
      return jsonResponse(beta);
    }
    if (url === "/api/config" && init?.method === "PATCH") {
      return jsonResponse({
        extraScanPaths: [],
        overrides: { "alpha-id": { note: "Saved note" } },
        customEntries: []
      });
    }
    if (url === "/api/import/github/preview" && init?.method === "POST") {
      return jsonResponse({
        repository: "owner/repo",
        clonePath: "/tmp/clone",
        candidates: [
          {
            id: "candidate-one",
            name: "remote-skill",
            description: "Remote skill",
            relativePath: "remote-skill"
          }
        ],
        autoInstallCandidateId: "candidate-one"
      });
    }
    if (url === "/api/import/github/install" && init?.method === "POST") {
      return jsonResponse({
        installedPath: "/Users/cresjq/.codex/skills/remote-skill",
        installedSkillName: "remote-skill"
      });
    }
    return jsonResponse({ message: "not found" }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

beforeEach(() => {
  mockFetch();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  test("renders skill records returned by the API", async () => {
    render(<App />);

    const list = within(await screen.findByLabelText("技能列表"));
    expect(await list.findByText("alpha")).toBeInTheDocument();
    expect(list.getByText("beta")).toBeInTheDocument();
  });

  test("clicking a skill displays Chinese summary before full markdown details", async () => {
    render(<App />);

    const list = within(await screen.findByLabelText("技能列表"));
    await userEvent.click(await list.findByText("beta"));

    const detail = within(await screen.findByLabelText("技能详情"));
    expect(await screen.findByText("这个技能能做什么")).toBeInTheDocument();
    expect(detail.getByText("适合处理插件技能。")).toBeInTheDocument();
    expect(detail.getByText(/# Beta body/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Existing note")).toBeInTheDocument();
  });

  test("search filters the skill list", async () => {
    render(<App />);

    const list = within(await screen.findByLabelText("技能列表"));
    await list.findByText("alpha");
    await userEvent.type(screen.getByLabelText("搜索技能"), "bet");

    expect(list.queryByText("alpha")).not.toBeInTheDocument();
    expect(list.getByText("beta")).toBeInTheDocument();
  });

  test("saving a note calls the config API", async () => {
    const fetchMock = mockFetch();
    render(<App />);

    const list = within(await screen.findByLabelText("技能列表"));
    await userEvent.click(await list.findByText("alpha"));
    await userEvent.type(screen.getByLabelText("备注"), "Saved note");
    await userEvent.click(screen.getByRole("button", { name: /保存修改/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/config",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("Saved note")
        })
      );
    });
  });

  test("saving Chinese fields calls the config API", async () => {
    const fetchMock = mockFetch();
    render(<App />);

    const list = within(await screen.findByLabelText("技能列表"));
    await userEvent.click(await list.findByText("alpha"));
    await userEvent.type(screen.getByLabelText("中文名称"), "调研助手");
    await userEvent.clear(screen.getByLabelText("中文摘要"));
    await userEvent.type(screen.getByLabelText("中文摘要"), "帮我查资料");
    await userEvent.click(screen.getByRole("button", { name: /保存修改/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/config",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("调研助手")
        })
      );
    });
  });

  test("previews and installs a GitHub skill", async () => {
    const fetchMock = mockFetch();
    render(<App />);

    const list = within(await screen.findByLabelText("技能列表"));
    await list.findByText("alpha");
    await userEvent.type(screen.getByLabelText("GitHub 仓库"), "owner/repo");
    await userEvent.click(screen.getByRole("button", { name: /预览 GitHub 技能/ }));

    await waitFor(() => {
      expect(screen.getAllByText("remote-skill").length).toBeGreaterThan(0);
    });
    await userEvent.click(screen.getByRole("button", { name: /安装选中技能/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/import/github/install",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("candidate-one")
        })
      );
    });
  });

  test("refresh loads the skills API again", async () => {
    const fetchMock = mockFetch();
    render(<App />);

    const list = within(await screen.findByLabelText("技能列表"));
    await list.findByText("alpha");
    await userEvent.click(screen.getByRole("button", { name: /刷新/ }));

    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/skills")).toHaveLength(2);
  });
});
