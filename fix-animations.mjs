import fs from 'fs-extra';
import path from 'path';

const cwd = process.cwd();
const appFolder = path.join(cwd, 'src/ui/src/app');
const appConfigPath = path.join(appFolder, 'app.config.ts');

let appConfig = fs.readFileSync(appConfigPath).toString();

appConfig = appConfig
  .replaceAll(
    `import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';`,
    `import { provideAnimations } from '@angular/platform-browser/animations';`
  )
  .replaceAll('provideAnimationsAsync()', 'provideAnimations()');

fs.writeFileSync(appConfigPath, appConfig);
