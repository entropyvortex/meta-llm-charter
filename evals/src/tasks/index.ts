import fs from 'fs/promises';
import path from 'path';
import { TaskDefinition } from '../types.js';

/**
 * Auto-discovers tasks from the fixtures/ directory. Each subdirectory of
 * fixtures/ is one task; its TASK.md is the prompt and the rest of the
 * directory is the workspace snapshot copied into each trial.
 *
 * Adding a new task = drop a directory in fixtures/. No code edits here.
 */
export async function loadTasks(fixturesDir: string): Promise<TaskDefinition[]> {
  const entries = await fs.readdir(fixturesDir, { withFileTypes: true });
  const tasks: TaskDefinition[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fixtureDir = path.join(fixturesDir, entry.name);
    const taskPath = path.join(fixtureDir, 'TASK.md');
    let prompt: string;
    try {
      prompt = await fs.readFile(taskPath, 'utf-8');
    } catch {
      console.warn(`Skipping fixture ${entry.name}: missing TASK.md`);
      continue;
    }
    tasks.push({ name: entry.name, prompt, fixtureDir });
  }
  return tasks.sort((a, b) => a.name.localeCompare(b.name));
}
