import chalk from 'chalk';
import fs from 'fs/promises';
import Handlebars from 'handlebars';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ScaffoldFeatureArgs {
  featureName: string;
  operations?: string[];
}

export async function scaffoldFeature(args: ScaffoldFeatureArgs) {
  const messages: string[] = [];
  try {
    const { featureName, operations } = args;
    if (!featureName) throw new Error('featureName is required');

    const featureNameStr = String(featureName);
    const pascalName =
      featureNameStr.charAt(0).toUpperCase() + featureNameStr.slice(1);
    const camelName =
      featureNameStr.charAt(0).toLowerCase() + featureNameStr.slice(1);

    messages.push(`Scaffolding feature: ${chalk.bold(pascalName)}`);

    // Paths
    // Assuming templates are in ../templates relative to this built file
    // When built, structure is build/tools/scaffold-feature.js -> build/templates/
    // Source structure: src/tools/scaffold-feature.ts -> src/templates/
    // We need to locate templates correctly.
    // If running via ts-node/transpilation, it might be different.
    // Let's assume standardized build output or verify existence.

    let templatesDir = path.resolve(__dirname, '../templates');

    // Check if templates exist there, if not try src/templates (dev mode)
    try {
      await fs.access(templatesDir);
    } catch {
      templatesDir = path.resolve(__dirname, '../../src/templates');
    }

    const targetDir = path.join(process.cwd(), 'src/features', camelName);
    await fs.mkdir(targetDir, { recursive: true });

    // Read Templates
    const repoTemplateSrc = await fs.readFile(
      path.join(templatesDir, 'universal-repo.ts.hbs'),
      'utf8'
    );
    const useCaseTemplateSrc = await fs.readFile(
      path.join(templatesDir, 'usecase.ts.hbs'),
      'utf8'
    );

    // Compile
    const repoTemplate = Handlebars.compile(repoTemplateSrc);
    const useCaseTemplate = Handlebars.compile(useCaseTemplateSrc);

    const data = {
      featureName: pascalName,
      operations: operations || [],
      timestamp: new Date().toISOString(),
    };

    // Write Files
    const repoPath = path.join(targetDir, `Universal${pascalName}Repo.ts`);
    const useCasePath = path.join(targetDir, `${pascalName}UseCase.ts`);

    await fs.writeFile(repoPath, repoTemplate(data));
    messages.push(`Created: ${repoPath}`);

    await fs.writeFile(useCasePath, useCaseTemplate(data));
    messages.push(`Created: ${useCasePath}`);

    // Also update main.ts? (Optional, skipping for now as it's complex to parse AST safely without more tools)
    messages.push(
      chalk.green(`✅ Feature ${pascalName} scaffolded successfully.`)
    );

    return {
      content: [{ type: 'text', text: messages.join('\n') }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}\nLogs:\n${messages.join('\n')}`,
        },
      ],
      isError: true,
    };
  }
}
