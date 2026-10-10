import { Logger } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const template = `import type { QueryInterface } from 'sequelize';

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  await context.sequelize.transaction(async (_transaction) => {
    // Add schema changes using context and pass the transaction to each operation.
  });
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  await context.sequelize.transaction(async (_transaction) => {
    // Reverse the changes made by up.
  });
}
`;

export function createMigration(
  name: string,
  directory = path.resolve('src/migrations'),
  now = new Date(),
): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    throw new Error(
      'Use a lowercase kebab-case migration name, for example create-users',
    );
  }
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const filePath = path.join(directory, `${timestamp}-${name}.ts`);
  mkdirSync(directory, { recursive: true });
  writeFileSync(filePath, template, { encoding: 'utf8', flag: 'wx' });
  return filePath;
}

if (require.main === module) {
  try {
    const name = process.argv[2];
    if (!name || process.argv.length !== 3) {
      throw new Error('Usage: npm run make:migration -- create-users');
    }
    Logger.log(`Created ${createMigration(name)}`, 'Migrations');
  } catch (error: unknown) {
    Logger.error(
      error instanceof Error ? error.message : 'Could not create migration',
      undefined,
      'Migrations',
    );
    process.exitCode = 1;
  }
}
