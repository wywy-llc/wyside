import fs from 'fs-extra';
import path from 'path';

const cwd = process.cwd();
const uiDist = process.argv[2]
  ? path.resolve(cwd, process.argv[2])
  : path.join(cwd, 'src/ui/dist/ui/browser');
const files = fs
  .readdirSync(uiDist)
  .filter(f => f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.css'));

for (const filename of files) {
  let newName = filename;
  const oldPath = path.join(uiDist, filename);

  if (path.extname(filename) === '.html') {
    newName = 'ui.html';
    const newPath = path.join(cwd, 'dist', newName);
    // Replace <script> tags with GAS <?!= ?> tags
    const scriptRegex = /<script src="([^"]*).js" type="module"><\/script>/g;
    const cssRegex = /<link rel="stylesheet" href="([^"]*).css".*(?=<\/head>)/g;
    let htmlContent = fs.readFileSync(oldPath).toString();
    htmlContent = htmlContent.replaceAll(
      scriptRegex,
      "<?!= include('$1'); ?>\n"
    );
    htmlContent = htmlContent.replaceAll(
      cssRegex,
      "\n<?!= include('$1'); ?>\n"
    );
    fs.writeFileSync(newPath, htmlContent);
  } else if (path.extname(filename) === '.js') {
    newName = path.format({ ...path.parse(filename), base: '', ext: '.html' });
    const newPath = path.join(cwd, 'dist', newName);
    // Add a <script> tag around the js code
    const jsContent = fs.readFileSync(oldPath).toString();
    fs.writeFileSync(
      newPath,
      `<script type="module">\n${jsContent}\n</script>`
    );
  } else {
    newName = path.format({ ...path.parse(filename), base: '', ext: '.html' });
    const newPath = path.join(cwd, 'dist', newName);
    const cssContent = fs.readFileSync(oldPath).toString();
    fs.writeFileSync(newPath, `<style>\n${cssContent}\n</style>`);
  }
}
