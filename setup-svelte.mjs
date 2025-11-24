import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const uiDir = path.join(cwd, 'src/ui');

// Ensure src directory exists
if (!fs.existsSync(path.join(cwd, 'src'))) {
  fs.mkdirSync(path.join(cwd, 'src'));
}

if (!fs.existsSync(uiDir)) {
  console.log('Creating Svelte app with Vite...');
  // Create the project in src/ui
  execSync('npm create vite@latest src/ui -- --template svelte-ts', {
    stdio: 'inherit',
  });

  console.log('Installing UI dependencies...');
  execSync('cd src/ui && npm install', { stdio: 'inherit' });

  console.log('Setting up Tailwind CSS...');
  // Install Tailwind and peers
  execSync('cd src/ui && npm install -D tailwindcss postcss autoprefixer', {
    stdio: 'inherit',
  });
  // Init Tailwind
  execSync('cd src/ui && npx tailwindcss init -p', { stdio: 'inherit' });

  // Configure tailwind.config.js
  const tailwindConfigPath = path.join(uiDir, 'tailwind.config.js');
  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;
  fs.writeFileSync(tailwindConfigPath, tailwindConfig);

  // Add directives to CSS
  // Try to find app.css or index.css
  const possibleCssFiles = ['src/app.css', 'src/index.css', 'src/global.css'];
  let cssFile = possibleCssFiles.find(f => fs.existsSync(path.join(uiDir, f)));

  // If no CSS file found, create src/app.css and ensure it is imported (complex),
  // but standard template usually has app.css.
  if (!cssFile) {
    cssFile = 'src/app.css'; // Default fallback
  }

  const cssPath = path.join(uiDir, cssFile);
  const directives = `@tailwind base;
@tailwind components;
@tailwind utilities;

`;

  let currentContent = '';
  if (fs.existsSync(cssPath)) {
    currentContent = fs.readFileSync(cssPath, 'utf8');
  }

  fs.writeFileSync(cssPath, directives + currentContent);

  console.log('Svelte UI with Tailwind CSS setup complete.');
} else {
  console.log('src/ui already exists, skipping creation.');
}
