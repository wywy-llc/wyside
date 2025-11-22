/**
 * Copyright 2025 wywy LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * you may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
