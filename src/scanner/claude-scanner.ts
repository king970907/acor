import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { ClaudeConfig, ExistingSkill, ExistingRule } from '../types/index.js';
import { fileExists } from '../utils/fs.js';
import { getClaudeDir, getClaudeSkillsDir, getClaudeRulesDir } from '../utils/paths.js';

export async function scanClaudeConfig(cwd: string): Promise<ClaudeConfig> {
  const claudeDir = getClaudeDir(cwd);
  const hasClaudeDir = await fileExists(claudeDir);

  if (!hasClaudeDir) {
    return { hasClaudeDir: false, skills: [], rules: [] };
  }

  const [skills, rules] = await Promise.all([
    scanSkills(getClaudeSkillsDir(cwd)),
    scanRules(getClaudeRulesDir(cwd)),
  ]);

  return { hasClaudeDir: true, skills, rules };
}

async function scanSkills(skillsDir: string): Promise<ExistingSkill[]> {
  const exists = await fileExists(skillsDir);
  if (!exists) return [];

  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  const skills: ExistingSkill[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!await fileExists(skillFile)) continue;

    const raw = await fs.readFile(skillFile, 'utf8');
    const parsed = matter(raw);
    skills.push({
      name: entry.name,
      path: skillFile,
      frontmatter: parsed.data,
      body: parsed.content,
    });
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

async function scanRules(rulesDir: string): Promise<ExistingRule[]> {
  const exists = await fileExists(rulesDir);
  if (!exists) return [];

  const rules: ExistingRule[] = [];

  async function walk(dir: string, prefix: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const content = await fs.readFile(full, 'utf8');
        rules.push({
          name: entry.name.replace(/\.md$/, ''),
          relativePath: rel,
          path: full,
          content,
        });
      }
    }
  }

  await walk(rulesDir, '');
  return rules.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
