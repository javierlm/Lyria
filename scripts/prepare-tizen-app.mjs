import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const templateDir = path.join(rootDir, 'tizen', 'template');
const outputDir = path.join(rootDir, 'tizen', 'app');
const staticDir = path.join(rootDir, 'static');

const remoteAppUrl =
  process.env.TIZEN_REMOTE_APP_URL ||
  process.env.PUBLIC_APP_BASE_URL ||
  process.env.PUBLIC_AUTH_BASE_URL ||
  process.env.PUBLIC_API_BASE_URL ||
  'https://example.com';

const remoteOrigin = new URL(remoteAppUrl).origin;
const packageId = process.env.TIZEN_PACKAGE_ID || 'LyriaTV01';
const appId = process.env.TIZEN_APP_ID || `${packageId}.lyria`;
const appName = process.env.TIZEN_APP_NAME || 'Lyria';
const appVersion = process.env.npm_package_version || process.env.TIZEN_APP_VERSION || '0.0.1';
const requiredVersion = process.env.TIZEN_REQUIRED_VERSION || '6.5';

function applyTemplate(template, replacements) {
  return Object.entries(replacements).reduce(
    (content, [key, value]) => content.replaceAll(`{{${key}}}`, value),
    template
  );
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const [configTemplate, indexTemplate] = await Promise.all([
    readFile(path.join(templateDir, 'config.xml'), 'utf8'),
    readFile(path.join(templateDir, 'index.html'), 'utf8')
  ]);

  const replacements = {
    APP_ID: appId,
    APP_NAME: appName,
    APP_VERSION: appVersion,
    PACKAGE_ID: packageId,
    REQUIRED_VERSION: requiredVersion,
    REMOTE_APP_URL: remoteAppUrl,
    REMOTE_ORIGIN: remoteOrigin
  };

  await Promise.all([
    writeFile(
      path.join(outputDir, 'config.xml'),
      applyTemplate(configTemplate, replacements),
      'utf8'
    ),
    writeFile(
      path.join(outputDir, 'index.html'),
      applyTemplate(indexTemplate, replacements),
      'utf8'
    ),
    copyFile(path.join(staticDir, 'lyria-favicon-144x144.png'), path.join(outputDir, 'icon.png'))
  ]);

  console.log('Prepared Tizen app shell in tizen/app');
  console.log(`Remote app URL: ${remoteAppUrl}`);
  console.log(`Remote origin: ${remoteOrigin}`);
  console.log(`Application ID: ${appId}`);
}

main().catch((error) => {
  console.error('Failed to prepare Tizen app shell:', error);
  process.exitCode = 1;
});
