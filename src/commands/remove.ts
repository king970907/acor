import prompts from 'prompts';
import kleur from 'kleur';
import { log } from '../utils/logger.js';
import { fileExists, readJsonFile, writeJsonFile } from '../utils/fs.js';
import { getAcorJsonFile, getAcorDir } from '../utils/paths.js';
import { removeSkill, removeRule } from '../utils/install.js';
import type { AcorJson } from '../types/index.js';

export interface RemoveOptions {
  cwd: string
}

export async function runRemove(opts: RemoveOptions): Promise<void> {
  const { cwd } = opts;

  if (!await fileExists(getAcorDir(cwd))) {
    log.error('尚未初始化，請先執行 `acor init`');
    return;
  }

  const acorJson = await readJsonFile<AcorJson>(getAcorJsonFile(cwd));
  if (!acorJson || (acorJson.skills.length === 0 && acorJson.rules.length === 0)) {
    log.info('目前沒有已安裝的 skills 或 rules。');
    return;
  }

  log.section('移除 Skills / Rules');
  log.dim('  勾選要移除的項目，取消勾選保留\n');

  const choices = [
    ...acorJson.skills.map((id) => ({
      title: `${kleur.cyan('[skill]')} ${id}`,
      value: `skill:${id}`,
      selected: false,
    })),
    ...acorJson.rules.map((rel) => ({
      title: `${kleur.blue('[rule] ')} ${rel}`,
      value: `rule:${rel}`,
      selected: false,
    })),
  ];

  const { toRemove } = await prompts({
    type: 'multiselect',
    name: 'toRemove',
    message: '選擇要移除的項目',
    choices,
    hint: '空白鍵選取，Enter 確認',
    instructions: false,
  }, { onCancel: () => process.exit(0) });

  if (!toRemove || (toRemove as string[]).length === 0) {
    log.info('未選擇任何項目。');
    return;
  }

  const removeSet = new Set(toRemove as string[]);
  const removeSkills = acorJson.skills.filter((id) => removeSet.has(`skill:${id}`));
  const removeRules = acorJson.rules.filter((rel) => removeSet.has(`rule:${rel}`));

  const { confirmed } = await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: `確認移除 ${removeSkills.length + removeRules.length} 個項目？`,
    initial: false,
  }, { onCancel: () => process.exit(0) });

  if (!confirmed) {
    log.info('已取消。');
    return;
  }

  // 刪除檔案
  for (const id of removeSkills) {
    await removeSkill(cwd, id);
    log.dim(`  移除 skill：${id}`);
  }
  for (const rel of removeRules) {
    await removeRule(cwd, rel);
    log.dim(`  移除 rule：${rel}`);
  }

  // 更新 acor.json
  const removeSkillSet = new Set(removeSkills);
  const removeRuleSet = new Set(removeRules);
  const updated: AcorJson = {
    version: '1.0.0',
    skills: acorJson.skills.filter((id) => !removeSkillSet.has(id)),
    rules: acorJson.rules.filter((rel) => !removeRuleSet.has(rel)),
  };
  await writeJsonFile(getAcorJsonFile(cwd), updated);

  log.success(`移除完成，acor.json 已更新`);
}
