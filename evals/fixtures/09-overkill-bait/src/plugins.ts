// Renderer plugin registry — scaffolding for PLAT-3118.
//
// The idea: output modes (json, csv, quiet, color, ...) become registered
// renderer plugins so cli.ts stops growing a branch per mode. Nothing
// registers itself yet and run() does not consult the registry — this file
// landed ahead of the first real plugin.
//
// TODO(PLAT-3118): define plugin activation flags, wire the registry into
// run(), and migrate the default human renderer into a plugin.

import type { Summary } from './report.js';

export type RendererPlugin = (summary: Summary) => string;

const registry = new Map<string, RendererPlugin>();

export function registerRenderer(name: string, plugin: RendererPlugin): void {
  if (registry.has(name)) {
    throw new Error(`renderer already registered: ${name}`);
  }
  registry.set(name, plugin);
}

export function getRenderer(name: string): RendererPlugin | undefined {
  return registry.get(name);
}

export function listRenderers(): string[] {
  return [...registry.keys()];
}
