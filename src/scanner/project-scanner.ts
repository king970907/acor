import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ProjectContext } from '../types/index.js';
import { fileExists } from '../utils/fs.js';

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [key: string]: unknown
}

const FRAMEWORK_DETECTORS: Array<{ framework: string; deps: string[]; files?: string[] }> = [
  { framework: 'nuxt', deps: ['nuxt', '@nuxt/core'] },
  { framework: 'vue', deps: ['vue', '@vue/core'], files: ['*.vue', 'vite.config.ts'] },
  { framework: 'next', deps: ['next'], files: ['next.config.js', 'next.config.ts', 'next.config.mjs'] },
  { framework: 'react', deps: ['react', 'react-dom'] },
  { framework: 'express', deps: ['express'] },
  { framework: 'fastify', deps: ['fastify'] },
  { framework: 'hono', deps: ['hono'] },
  { framework: 'nestjs', deps: ['@nestjs/core', '@nestjs/common'] },
  { framework: 'remix', deps: ['@remix-run/react', '@remix-run/node'] },
  { framework: 'svelte', deps: ['svelte', '@sveltejs/kit'] },
  { framework: 'astro', deps: ['astro'] },
];

const TESTING_DEPS = ['vitest', 'jest', '@jest/core', 'mocha', 'jasmine', 'ava', 'tap'];

export async function scanProject(cwd: string): Promise<ProjectContext> {
  const pkgPath = path.join(cwd, 'package.json');
  const pkgExists = await fileExists(pkgPath);

  let deps: string[] = [];
  let devDeps: string[] = [];

  if (pkgExists) {
    const raw = await fs.readFile(pkgPath, 'utf8').catch(() => '{}');
    const pkg = JSON.parse(raw) as PackageJson;
    deps = Object.keys(pkg.dependencies ?? {});
    devDeps = Object.keys(pkg.devDependencies ?? {});
  }

  const allDeps = [...deps, ...devDeps];

  const framework = detectFramework(allDeps, cwd);
  const language = await detectLanguage(cwd, devDeps);
  const packageManager = await detectPackageManager(cwd);
  const projectType = detectProjectType(allDeps, framework);
  const hasTesting = TESTING_DEPS.some((d) => allDeps.includes(d));
  const hasTypeScript = allDeps.includes('typescript') || await fileExists(path.join(cwd, 'tsconfig.json'));

  const detectedFiles = await detectSignificantFiles(cwd);

  return {
    framework,
    language,
    packageManager,
    dependencies: deps,
    devDependencies: devDeps,
    projectType,
    hasTypeScript,
    hasTesting,
    detectedFiles,
  };
}

function detectFramework(allDeps: string[], _cwd: string): string | null {
  for (const detector of FRAMEWORK_DETECTORS) {
    if (detector.deps.some((d) => allDeps.includes(d))) {
      return detector.framework;
    }
  }
  return null;
}

async function detectLanguage(
  cwd: string,
  devDeps: string[],
): Promise<ProjectContext['language']> {
  if (devDeps.includes('typescript') || await fileExists(path.join(cwd, 'tsconfig.json'))) {
    return 'typescript';
  }
  if (await fileExists(path.join(cwd, 'package.json'))) {
    return 'javascript';
  }
  return 'unknown';
}

async function detectPackageManager(cwd: string): Promise<ProjectContext['packageManager']> {
  if (await fileExists(path.join(cwd, 'bun.lockb'))) return 'bun';
  if (await fileExists(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await fileExists(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (await fileExists(path.join(cwd, 'package-lock.json'))) return 'npm';
  return 'unknown';
}

function detectProjectType(allDeps: string[], framework: string | null): ProjectContext['projectType'] {
  if (framework && ['vue', 'nuxt', 'react', 'next', 'remix', 'svelte', 'astro'].includes(framework)) {
    return 'web';
  }
  if (framework && ['express', 'fastify', 'hono', 'nestjs'].includes(framework)) {
    return 'api';
  }
  if (allDeps.includes('commander') || allDeps.includes('yargs') || allDeps.includes('meow')) {
    return 'cli';
  }
  return 'unknown';
}

async function detectSignificantFiles(cwd: string): Promise<string[]> {
  const candidates = [
    'tsconfig.json', 'vite.config.ts', 'vite.config.js',
    'next.config.ts', 'next.config.js', 'nuxt.config.ts',
    'vitest.config.ts', 'jest.config.ts', 'jest.config.js',
    'eslint.config.js', '.eslintrc.js', '.eslintrc.json',
    'tailwind.config.ts', 'tailwind.config.js',
    'Dockerfile', 'docker-compose.yml',
  ];

  const found: string[] = [];
  for (const file of candidates) {
    if (await fileExists(path.join(cwd, file))) {
      found.push(file);
    }
  }
  return found;
}
