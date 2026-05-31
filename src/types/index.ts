export interface SkillTrigger {
  type: 'dependency' | 'devDependency' | 'framework' | 'file' | 'language' | 'projectType'
  value: string
}

// acor.json（進 git，宣告專案使用哪些 skills / rules）
export interface AcorJson {
  version: string
  skills: string[]
  rules: string[]
}

// hub 中每個 skill 的 metadata（acor add 顯示清單用）
export interface HubSkill {
  id: string
  name: string
  description: string
  version: string
  tags: string[]
  triggers: SkillTrigger[]
}

// hub 中每個 rule 的 metadata
export interface HubRule {
  id: string
  name: string
  description: string
  triggers: SkillTrigger[]
  relativePath: string
}

// /acor-scan 的結果快取
export interface LastScan {
  scannedAt: string
  installedSkills: string[]
  installedRules: string[]
  conflicts: Array<{
    type: 'skill-skill' | 'rule-rule' | 'skill-rule'
    description: string
    items: string[]
    evidence?: Record<string, string>
  }>
}
