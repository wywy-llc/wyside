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
import cleanup from 'rollup-plugin-cleanup';
import license from 'rollup-plugin-license';
import prettier from 'rollup-plugin-prettier';
import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'src/main.ts',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    cleanup({ comments: 'none', extensions: ['.ts'] }),
    license({
      banner: {
        content: {
          file: 'license-header.txt',
        },
      },
    }),
    typescript(),
    prettier({ parser: 'typescript' }),
  ],
  context: 'this',
};
