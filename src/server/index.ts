import express from "express";
import { createServer as createViteServer } from "vite";
import {
  DEFAULT_CODEX_SKILLS_ROOT,
  DEFAULT_CONFIG_PATH,
  DEFAULT_PLUGIN_CACHE_ROOT
} from "./paths";
import { loadConfig, updateConfig } from "./configStore";
import { validateLocalSkillDirectory } from "./importLocal";
import { scanSkills } from "./skillScanner";
import { deriveSkillSummary } from "./skillSummary";
import type { SkillConfigPatch, SkillViewRecord } from "../shared/types";

export interface ServerOptions {
  codexSkillsRoot?: string;
  pluginCacheRoot?: string;
  configPath?: string;
  useViteMiddleware?: boolean;
}

export function createApp(options: ServerOptions = {}) {
  const app = express();
  app.use(express.json());

  const codexSkillsRoot = options.codexSkillsRoot ?? DEFAULT_CODEX_SKILLS_ROOT;
  const pluginCacheRoot = options.pluginCacheRoot ?? DEFAULT_PLUGIN_CACHE_ROOT;
  const configPath = options.configPath ?? DEFAULT_CONFIG_PATH;

  app.get("/api/config", async (_request, response, next) => {
    try {
      response.json(await loadConfig(configPath));
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/config", async (request, response, next) => {
    try {
      response.json(await updateConfig(request.body as SkillConfigPatch, configPath));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/skills", async (_request, response, next) => {
    try {
      response.json(await readSkills(codexSkillsRoot, pluginCacheRoot, configPath));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/skills/:id", async (request, response, next) => {
    try {
      const result = await readSkills(codexSkillsRoot, pluginCacheRoot, configPath);
      const skill = result.skills.find((item) => item.id === request.params.id);
      if (!skill) {
        response.status(404).json({ message: "Skill not found" });
        return;
      }
      response.json(skill);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/import/local", async (request, response, next) => {
    try {
      const inputPath = String(request.body?.path ?? "");
      const validation = await validateLocalSkillDirectory(inputPath);
      if (!validation.valid) {
        response.status(400).json(validation);
        return;
      }

      const current = await loadConfig(configPath);
      const extraScanPaths = Array.from(new Set([...current.extraScanPaths, validation.path]));
      response.json(await updateConfig({ extraScanPaths }, configPath));
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : String(error);
    response.status(500).json({ message });
  });

  return app;
}

async function readSkills(codexSkillsRoot: string, pluginCacheRoot: string, configPath: string) {
  const config = await loadConfig(configPath);
  const scanResult = await scanSkills({
    codexSkillsRoot,
    pluginCacheRoot,
    extraScanPaths: config.extraScanPaths
  });
  const skills: SkillViewRecord[] = scanResult.skills.map((skill) => ({
    ...skill,
    override: config.overrides[skill.id] ?? {},
    summary: deriveSkillSummary(skill, config.overrides[skill.id])
  }));
  return { ...scanResult, skills, config };
}

async function start() {
  const app = createApp();
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);

  const port = Number(process.env.PORT ?? 5173);
  app.listen(port, () => {
    console.log(`Codex Skills Dashboard: http://localhost:${port}`);
  });
}

if (process.env.NODE_ENV !== "test" && process.argv[1]?.endsWith("src/server/index.ts")) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
