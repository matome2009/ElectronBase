#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const configArg = process.argv[2] || 'template.config.json';
const configPath = path.resolve(rootDir, configArg);

if (!fs.existsSync(configPath)) {
  console.error(`Config file not found: ${configPath}`);
  console.error('Copy template.config.example.json to template.config.json and edit it first.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function toKebabCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function toSnakeCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function setEnvVar(content, key, value) {
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const nextLine = `${key}=${value}`;
  if (pattern.test(content)) {
    return content.replace(pattern, nextLine);
  }
  return `${content.trimEnd()}\n${nextLine}\n`;
}

function updateJsonFile(relativePath, updater) {
  const filePath = path.join(rootDir, relativePath);
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  updater(json);
  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`updated ${relativePath}`);
}

function updateTextFile(relativePath, updater) {
  const filePath = path.join(rootDir, relativePath);
  const current = fs.readFileSync(filePath, 'utf8');
  const next = updater(current);
  fs.writeFileSync(filePath, next);
  console.log(`updated ${relativePath}`);
}

const appDisplayName = config.appDisplayName || 'My Desktop App';
const productName = config.productName || appDisplayName.replace(/[^A-Za-z0-9]/g, '');
const npmPackageName = config.npmPackageName || toKebabCase(productName);
const rustPackageName = config.rustPackageName || toSnakeCase(productName);
const rustLibName = `${rustPackageName}_lib`;
const bundleIdentifier = config.bundleIdentifier || `com.example.${npmPackageName.replace(/-/g, '')}`;
const appDescription = config.appDescription || `${appDisplayName} desktop application`;
const websiteUrl = (config.websiteUrl || 'https://example.com').replace(/\/+$/, '');
const adminConsoleUrl = (config.adminConsoleUrl || `${websiteUrl}/admin`).replace(/\/+$/, '');
const supportEmail = config.supportEmail || 'dev@example.com';
const firebaseProjectId = config.firebaseProjectId || 'my-firebase-project';
const firebaseRegion = config.firebaseRegion || 'asia-northeast1';
const firebaseDatabaseRegion = config.firebaseDatabaseRegion || 'asia-southeast1';
const walletConnectProjectId = config.walletConnectProjectId || 'your_walletconnect_project_id';
const keyringService = config.keyringService || npmPackageName;

updateJsonFile('frontend/package.json', (pkg) => {
  pkg.name = npmPackageName;
  pkg.author = {
    ...(pkg.author || {}),
    name: appDisplayName,
    email: supportEmail,
  };
  pkg.description = appDescription;
  pkg.homepage = websiteUrl;
});

updateJsonFile('frontend/src-tauri/tauri.conf.json', (tauriConfig) => {
  tauriConfig.productName = productName;
  tauriConfig.identifier = bundleIdentifier;
  if (Array.isArray(tauriConfig.app?.windows) && tauriConfig.app.windows.length > 0) {
    tauriConfig.app.windows[0].title = appDisplayName;
  }
});

updateTextFile('frontend/src-tauri/Cargo.toml', (content) => {
  let next = content.replace(/(\[package\][\s\S]*?name\s*=\s*")[^"]+(")/, `$1${rustPackageName}$2`);
  next = next.replace(/(\[lib\][\s\S]*?name\s*=\s*")[^"]+(")/, `$1${rustLibName}$2`);
  return next;
});

updateTextFile('frontend/src-tauri/src/main.rs', (content) =>
  content.replace(/[a-zA-Z0-9_]+_lib::run\(\)/, `${rustLibName}::run()`),
);

updateTextFile('frontend/src-tauri/src/lib.rs', (content) =>
  content.replace(/const KEYRING_SERVICE: &str = ".*?";/, `const KEYRING_SERVICE: &str = "${keyringService}";`),
);

updateTextFile('frontend/src-tauri/snapcraft.yaml', (content) => {
  let next = content.replace(/^name:\s*.*$/m, `name: ${npmPackageName}`);
  next = next.replace(/^summary:\s*.*$/m, `summary: ${appDisplayName} desktop application`);
  next = next.replace(/(^apps:\s*\n\s*)([^:\n]+):/m, `$1${npmPackageName}:`);
  next = next.replace(/^(\s*desktop:\s*usr\/share\/applications\/).+$/m, `$1${npmPackageName}.desktop`);
  next = next.replace(/(^parts:\s*\n\s*)([^:\n]+):/m, `$1${rustPackageName}:`);
  next = next.replace(/release\/bundle\/deb\/[^/\n]+_1\.0\.0_amd64\.deb/m, `release/bundle/deb/${productName}_1.0.0_amd64.deb`);
  next = next.replace(/rm -f \$SNAPCRAFT_PRIME\/usr\/share\/applications\/[^\n]+/m, `rm -f $SNAPCRAFT_PRIME/usr/share/applications/${productName}.desktop`);
  next = next.replace(/exec "\$SNAP_DIR\/usr\/bin\/[^"]+"/m, `exec "$SNAP_DIR/usr/bin/${rustPackageName}"`);
  next = next.replace(/cat > \$SNAPCRAFT_PART_INSTALL\/usr\/share\/applications\/[^\n]+/m, `cat > $SNAPCRAFT_PART_INSTALL/usr/share/applications/${npmPackageName}.desktop << 'EOF'`);
  next = next.replace(/^      Name=.*$/m, `      Name=${appDisplayName}`);
  next = next.replace(/^      Exec=.*$/m, `      Exec=${npmPackageName}`);
  next = next.replace(/^      Icon=\$\{SNAP\}\/usr\/share\/icons\/hicolor\/128x128\/apps\/.*$/m, `      Icon=\${SNAP}/usr/share/icons/hicolor/128x128/apps/${rustPackageName}.png`);
  return next;
});

for (const locale of ['ja', 'en', 'ko', 'zh']) {
  updateJsonFile(`frontend/src/renderer/i18n/locales/${locale}.json`, (messages) => {
    if (messages.header) messages.header.title = appDisplayName;
    if (messages.login) messages.login.title = appDisplayName;
  });
}

updateJsonFile('.firebaserc', (firebaseRc) => {
  firebaseRc.projects = { default: firebaseProjectId };
  firebaseRc.targets = {
    [firebaseProjectId]: {
      hosting: {
        dev: [`${firebaseProjectId}-dev`],
        prd: [`${firebaseProjectId}-prd`],
        'admin-dev': [`${firebaseProjectId}-dev-admin`],
        'admin-prd': [`${firebaseProjectId}-prd-admin`],
        website: [firebaseProjectId],
      },
    },
  };
});

updateTextFile('firebase.json', (content) =>
  content.replace(/"region":\s*"[^"]+"/g, `"region": "${firebaseRegion}"`),
);

updateTextFile('.env.example', (content) => {
  let next = content;
  next = setEnvVar(next, 'VITE_APP_NAME', appDisplayName);
  next = setEnvVar(next, 'VITE_APP_DESCRIPTION', appDescription);
  next = setEnvVar(next, 'VITE_APP_WEBSITE_URL', websiteUrl);
  next = setEnvVar(next, 'VITE_ADMIN_CONSOLE_URL', adminConsoleUrl);
  next = setEnvVar(next, 'FIREBASE_PROJECT_ID', firebaseProjectId);
  next = setEnvVar(next, 'FIREBASE_FUNCTIONS_REGION', firebaseRegion);
  next = setEnvVar(next, 'VITE_FIREBASE_AUTH_DOMAIN', `${firebaseProjectId}.firebaseapp.com`);
  next = setEnvVar(next, 'VITE_FIREBASE_PROJECT_ID', firebaseProjectId);
  next = setEnvVar(next, 'VITE_FIREBASE_STORAGE_BUCKET', `${firebaseProjectId}.firebasestorage.app`);
  next = setEnvVar(next, 'VITE_FIREBASE_DATABASE_URL', `https://${firebaseProjectId}-default-rtdb.${firebaseDatabaseRegion}.firebasedatabase.app`);
  next = setEnvVar(next, 'VITE_FUNCTIONS_REGION', firebaseRegion);
  next = setEnvVar(next, 'VITE_FUNCTIONS_PROJECT_ID', firebaseProjectId);
  next = setEnvVar(next, 'VITE_FUNCTIONS_URL', `https://${firebaseRegion}-${firebaseProjectId}.cloudfunctions.net`);
  next = setEnvVar(next, 'FIREBASE_DATABASE_URL', `https://${firebaseProjectId}-default-rtdb.${firebaseDatabaseRegion}.firebasedatabase.app`);
  next = setEnvVar(next, 'VITE_WALLETCONNECT_PROJECT_ID', walletConnectProjectId);
  next = setEnvVar(next, 'VITE_ENABLE_BILLING', 'false');
  next = setEnvVar(next, 'VITE_ENABLE_WATCHED_WALLETS', 'false');
  next = setEnvVar(next, 'VITE_ENABLE_TRANSACTIONS', 'false');
  next = setEnvVar(next, 'VITE_ENABLE_CONTACTS', 'false');
  next = setEnvVar(next, 'VITE_ENABLE_LABELS', 'false');
  next = setEnvVar(next, 'ENABLE_BILLING_API', 'false');
  next = setEnvVar(next, 'ENABLE_WALLET_API', 'false');
  next = setEnvVar(next, 'ENABLE_TRANSACTION_API', 'false');
  next = setEnvVar(next, 'ENABLE_CONTACT_API', 'false');
  next = setEnvVar(next, 'ENABLE_LABEL_API', 'false');
  return next;
});

console.log('');
console.log('Template bootstrap completed.');
console.log(`- App: ${appDisplayName}`);
console.log(`- Firebase project: ${firebaseProjectId}`);
console.log(`- Bundle identifier: ${bundleIdentifier}`);
