import { vi } from 'vitest';

const fs = {
  readJsonSync: vi.fn(),
  exists: vi.fn(),
  rm: vi.fn(),
  mkdirs: vi.fn(),
  move: vi.fn(),
  copyFile: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  ensureDir: vi.fn(),
};

export default fs;
export const readJsonSync = fs.readJsonSync;
export const exists = fs.exists;
export const rm = fs.rm;
export const mkdirs = fs.mkdirs;
export const move = fs.move;
export const copyFile = fs.copyFile;
export const stat = fs.stat;
export const readFile = fs.readFile;
export const writeFile = fs.writeFile;
export const ensureDir = fs.ensureDir;
