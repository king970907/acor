import type { Conflict, ExistingRule, ExistingSkill } from '../types/index.js';

interface ContradictionPair {
  topic: string
  patterns: RegExp[]
  description: (matched: string[]) => string
}

const CONTRADICTION_PAIRS: ContradictionPair[] = [
  {
    topic: 'indentation',
    patterns: [/\btabs?\b/i, /\b(2|4)\s*spaces?\b/i],
    description: (m) => `縮排設定衝突：同時出現「${m.join('」和「')}」`,
  },
  {
    topic: 'quotes',
    patterns: [/\bsingle.?quot/i, /\bdouble.?quot/i],
    description: (m) => `引號設定衝突：同時出現「${m.join('」和「')}」`,
  },
  {
    topic: 'semicolons',
    patterns: [/\bno.?semicolons?\b/i, /\b(use|require|always).?semicolons?\b/i],
    description: (m) => `分號設定衝突：同時出現「${m.join('」和「')}」`,
  },
  {
    topic: 'lineLength',
    patterns: [/max.{0,10}80.{0,10}char/i, /max.{0,10}120.{0,10}char/i],
    description: (m) => `行長限制衝突：同時出現「${m.join('」和「')}」`,
  },
  {
    topic: 'trailingComma',
    patterns: [/\bno.?trailing.?comma/i, /\b(always|require|use).?trailing.?comma/i],
    description: (m) => `尾逗號設定衝突：同時出現「${m.join('」和「')}」`,
  },
];

export function detectConflicts(
  rules: ExistingRule[],
  skills: ExistingSkill[],
): Conflict[] {
  const conflicts: Conflict[] = [];

  conflicts.push(...detectRuleContradictions(rules));
  conflicts.push(...detectSkillOverlaps(skills));

  return conflicts;
}

function detectRuleContradictions(rules: ExistingRule[]): Conflict[] {
  if (rules.length < 2) return [];

  const conflicts: Conflict[] = [];
  const allContent = rules.map((r) => ({ name: r.name, content: r.content }));

  for (const pair of CONTRADICTION_PAIRS) {
    const matchedItems: Array<{ name: string; match: string }> = [];

    for (const rule of allContent) {
      for (const pattern of pair.patterns) {
        const match = rule.content.match(pattern);
        if (match) {
          matchedItems.push({ name: rule.name, match: match[0] });
          break;
        }
      }
    }

    const uniquePatternMatches = new Set(
      matchedItems.map((item) => {
        for (let i = 0; i < pair.patterns.length; i++) {
          if (pair.patterns[i].test(item.match)) return i;
        }
        return -1;
      }),
    );

    if (uniquePatternMatches.size >= 2) {
      conflicts.push({
        type: 'rule-contradiction',
        description: pair.description(matchedItems.map((m) => m.match)),
        items: matchedItems.map((m) => m.name),
      });
    }
  }

  return conflicts;
}

function detectSkillOverlaps(skills: ExistingSkill[]): Conflict[] {
  if (skills.length < 2) return [];

  const conflicts: Conflict[] = [];
  const OVERLAP_GROUPS = [
    { topic: 'Vue', patterns: [/vue/i, /nuxt/i] },
    { topic: 'React', patterns: [/react/i, /next/i, /remix/i] },
    { topic: 'Testing', patterns: [/test/i, /vitest/i, /jest/i] },
    { topic: 'TypeScript', patterns: [/typescript/i, /ts-/i] },
    { topic: 'Node API', patterns: [/express/i, /fastify/i, /hono/i, /nestjs/i] },
  ];

  for (const group of OVERLAP_GROUPS) {
    const matched = skills.filter((s) =>
      group.patterns.some((p) => p.test(s.name)),
    );
    if (matched.length >= 2) {
      conflicts.push({
        type: 'skill-overlap',
        description: `可能重複的 ${group.topic} 相關 skills`,
        items: matched.map((s) => s.name),
      });
    }
  }

  return conflicts;
}
