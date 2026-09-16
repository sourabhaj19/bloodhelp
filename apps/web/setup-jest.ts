import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
setupZoneTestEnv();

// jsdom does not support @layer (used by PrimeNG) — silence those parse errors to keep output clean
const origConsoleError = console.error;
console.error = (...args: any[]) => {
  const first = args[0];
  const msg = typeof first === 'string' ? first : first?.message ?? '';
  if (msg.includes('Could not parse CSS stylesheet')) return;
  if (msg.includes('Error: Could not parse CSS')) return;
  origConsoleError(...(args as [any]));
};
