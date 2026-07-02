import { stat } from "node:fs/promises";
import path from "node:path";
import type { LocalImportValidation } from "../shared/types";

export async function validateLocalSkillDirectory(inputPath: string): Promise<LocalImportValidation> {
  const resolvedPath = path.resolve(inputPath);

  if (!(await isDirectory(resolvedPath))) {
    return {
      valid: false,
      path: inputPath,
      message: "Path does not exist or is not a directory"
    };
  }

  if (!(await isFile(path.join(resolvedPath, "SKILL.md")))) {
    return {
      valid: false,
      path: inputPath,
      message: "Directory does not contain SKILL.md"
    };
  }

  return { valid: true, path: inputPath };
}

async function isDirectory(value: string) {
  try {
    return (await stat(value)).isDirectory();
  } catch {
    return false;
  }
}

async function isFile(value: string) {
  try {
    return (await stat(value)).isFile();
  } catch {
    return false;
  }
}
