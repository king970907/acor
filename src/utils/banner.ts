import kleur from 'kleur';

export function printBanner(version: string): void {
  console.log('');
  console.log(kleur.bold().cyan('  ACOR') + kleur.dim(` v${version}`));
  console.log(kleur.dim('  AI Context Orchestration Runtime'));
  console.log('');
}
