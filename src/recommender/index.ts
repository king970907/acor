import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type {
  AcorRule,
  AcorSkill,
  ProjectContext,
  RuleRecommendation,
  SkillRecommendation,
  SkillTrigger,
} from '../types/index.js';
import { fileExists } from '../utils/fs.js';
import { getAssetsDir } from '../utils/paths.js';

export async function loadSkills(): Promise<AcorSkill[]> {
  const skillsDir = path.join(getAssetsDir(), 'skills');
  if (!await fileExists(skillsDir)) return [];

  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  const skills: AcorSkill[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!await fileExists(skillFile)) continue;

    const raw = await fs.readFile(skillFile, 'utf8');
    const parsed = matter(raw);
    const fm = parsed.data as Record<string, unknown>;

    skills.push({
      id: (fm.id as string) ?? entry.name,
      name: (fm.name as string) ?? entry.name,
      description: (fm.description as string) ?? '',
      version: (fm.version as string) ?? '1.0.0',
      triggers: (fm.triggers as SkillTrigger[]) ?? [],
      tags: (fm.tags as string[]) ?? [],
      body: parsed.content,
      sourcePath: skillFile,
    });
  }

  return skills;
}

export async function loadRules(): Promise<AcorRule[]> {
  const rulesDir = path.join(getAssetsDir(), 'rules');
  if (!await fileExists(rulesDir)) return [];

  const rules: AcorRule[] = [];

  async function walk(dir: string, prefix: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const raw = await fs.readFile(full, 'utf8');
        const parsed = matter(raw);
        const fm = parsed.data as Record<string, unknown>;
        const id = (fm.id as string) ?? entry.name.replace(/\.md$/, '');
        rules.push({
          id,
          name: (fm.name as string) ?? id,
          description: (fm.description as string) ?? '',
          triggers: (fm.triggers as SkillTrigger[]) ?? [],
          relativePath: rel,
          content: raw,
          sourcePath: full,
        });
      }
    }
  }

  await walk(rulesDir, '');
  return rules;
}

export function recommendSkills(
  skills: AcorSkill[],
  project: ProjectContext,
  alreadyInstalled: string[],
): SkillRecommendation[] {
  return skills
    .filter((s) => !alreadyInstalled.includes(s.id))
    .map((s) => ({ skill: s, ...scoreItem(s.triggers, project) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function recommendRules(
  rules: AcorRule[],
  project: ProjectContext,
  alreadyInstalled: string[],
): RuleRecommendation[] {
  return rules
    .filter((r) => !alreadyInstalled.includes(r.relativePath))
    .map((r) => {
      if (r.triggers.length === 0) {
        return { rule: r, score: 1.0, reasons: ['通用規則'] };
      }
      return { rule: r, ...scoreItem(r.triggers, project) };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

function scoreItem(
  triggers: SkillTrigger[],
  project: ProjectContext,
): { score: number; reasons: string[] } {
  if (triggers.length === 0) return { score: 0, reasons: [] };

  const reasons: string[] = [];
  let matched = 0;

  for (const trigger of triggers) {
    const result = checkTrigger(trigger, project);
    if (result) {
      matched++;
      reasons.push(result);
    }
  }

  if (matched === 0) return { score: 0, reasons: [] };

  const score = Math.round((matched / triggers.length) * 100) / 100;
  return { score, reasons };
}

function checkTrigger(trigger: SkillTrigger, project: ProjectContext): string | null {
  switch (trigger.type) {
    case 'framework':
      return project.framework === trigger.value ? `偵測到框架: ${trigger.value}` : null;
    case 'dependency':
      return project.dependencies.includes(trigger.value) ? `偵測到依賴: ${trigger.value}` : null;
    case 'devDependency':
      return project.devDependencies.includes(trigger.value) ? `偵測到開發依賴: ${trigger.value}` : null;
    case 'language':
      return project.language === trigger.value ? `語言: ${trigger.value}` : null;
    case 'projectType':
      return project.projectType === trigger.value ? `專案類型: ${trigger.value}` : null;
    case 'file':
      return project.detectedFiles.some((f) => f.includes(trigger.value)) ? `偵測到檔案: ${trigger.value}` : null;
    default:
      return null;
  }
}
