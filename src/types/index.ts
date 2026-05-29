export interface SkillTrigger {
  type: 'dependency' | 'devDependency' | 'framework' | 'file' | 'language' | 'projectType'
  value: string
}

export interface CatalogSkill {
  id: string
  name: string
  description: string
  version: string
  tags: string[]
  triggers: SkillTrigger[]
  sourcePath: string
}

export interface CatalogRule {
  id: string
  name: string
  description: string
  triggers: SkillTrigger[]
  relativePath: string
  sourcePath: string
}

export interface Catalog {
  version: string
  generatedAt: string
  skills: CatalogSkill[]
  rules: CatalogRule[]
}

export interface AcorState {
  version: string
  installedSkills: string[]
  installedRules: string[]
  archivedAt: Record<string, string>
}
