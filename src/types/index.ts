export interface ProjectContext {
  framework: string | null
  language: 'typescript' | 'javascript' | 'unknown'
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown'
  dependencies: string[]
  devDependencies: string[]
  projectType: 'web' | 'api' | 'cli' | 'library' | 'unknown'
  hasTypeScript: boolean
  hasTesting: boolean
  detectedFiles: string[]
}

export interface ExistingSkill {
  name: string
  path: string
  frontmatter: Record<string, unknown>
  body: string
}

export interface ExistingRule {
  name: string
  relativePath: string
  path: string
  content: string
}

export interface ClaudeConfig {
  hasClaudeDir: boolean
  skills: ExistingSkill[]
  rules: ExistingRule[]
}

export interface Conflict {
  type: 'rule-contradiction' | 'skill-overlap'
  description: string
  items: string[]
}

export interface SkillTrigger {
  type: 'dependency' | 'devDependency' | 'framework' | 'file' | 'language' | 'projectType'
  value: string
}

export interface AcorSkill {
  id: string
  name: string
  description: string
  version: string
  triggers: SkillTrigger[]
  tags: string[]
  body: string
  sourcePath: string
}

export interface AcorRule {
  id: string
  name: string
  description: string
  triggers: SkillTrigger[]
  relativePath: string
  content: string
  sourcePath: string
}

export interface SkillRecommendation {
  skill: AcorSkill
  score: number
  reasons: string[]
}

export interface RuleRecommendation {
  rule: AcorRule
  score: number
  reasons: string[]
}

export interface ScanResult {
  cwd: string
  scannedAt: string
  project: ProjectContext
  existing: ClaudeConfig
  conflicts: Conflict[]
  recommendations: SkillRecommendation[]
  ruleRecommendations: RuleRecommendation[]
}

export interface AcorState {
  version: string
  installedSkills: string[]
  installedRules: string[]
  archivedAt: Record<string, string>
}
