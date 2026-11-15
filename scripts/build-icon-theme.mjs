#!/usr/bin/env node
/**
 * Generates `icon_themes/zed-pixel-icon.json` from `catalog/icons.json`.
 *
 * The catalog is the same source file used by Jerry's Pixel Icons (VS Code).
 * Run `node scripts/build-icon-theme.mjs` after editing the catalog or the
 * extra associations below.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = join(ROOT_DIR, "catalog", "icons.json");
const OUTPUT_PATH = join(ROOT_DIR, "icon_themes", "zed-pixel-icon.json");

const THEME_NAME = "Zed Pixel Icon";
const APPEARANCE = "dark";

const FILE_ICON_DIR = "./icons/files";
const FOLDER_ICON_DIR = "./icons/folders";

/**
 * Extra exact file names mapped to existing pixel icons. Zed merges these with
 * its built-in stems, so only additions are needed here.
 */
const EXTRA_FILE_STEMS = {
  ".bash_logout": "shell",
  ".bash_profile": "shell",
  ".bashrc": "shell",
  ".editorconfig": "conf",
  ".eslintignore": "eslint",
  ".eslintrc": "eslint",
  ".eslintrc.cjs": "eslint",
  ".eslintrc.js": "eslint",
  ".eslintrc.json": "eslint",
  ".eslintrc.yml": "eslint",
  ".gitconfig": "git",
  ".gitkeep": "git",
  ".htaccess": "conf",
  ".npmignore": "npm",
  ".prettierrc.cjs": "prettier",
  ".prettierrc.json": "prettier",
  ".prettierrc.js": "prettier",
  ".prettierrc.toml": "prettier",
  ".prettierrc.yaml": "prettier",
  ".prettierrc.yml": "prettier",
  ".python-version": "py",
  ".ruby-version": "ruby",
  ".yarnrc": "yarn",
  ".yarnrc.yml": "yarn",
  ".zshrc": "shell",
  "Cargo.lock": "rust",
  "Cargo.toml": "rust",
  "Containerfile": "docker",
  "Gemfile": "ruby",
  "Gemfile.lock": "ruby",
  "Pipfile": "py",
  "Rakefile": "ruby",
  "compose.yaml": "docker",
  "compose.yml": "docker",
  "eslint.config.cjs": "eslint",
  "eslint.config.cts": "eslint",
  "eslint.config.mts": "eslint",
  "eslint.config.ts": "eslint",
  "go.work": "go",
  "go.work.sum": "go",
  "next.config.cjs": "next",
  "next.config.mts": "next",
  "package.json": "node2",
  "pnpm-workspace.yaml": "pnpm",
  "pyproject.toml": "py",
  "requirements.txt": "py",
  "rust-toolchain": "rust",
  "rust-toolchain.toml": "rust",
  "tailwind.config.cjs": "tailwind",
  "tailwind.config.mjs": "tailwind",
  "tailwind.config.mts": "tailwind",
  "vite.config.cjs": "vite",
  "vite.config.cts": "vite",
  "vite.config.mts": "vite",
  "vitest.config.mts": "vitest",
};

/** Extra suffixes that reuse an existing pixel icon. */
const EXTRA_FILE_SUFFIXES = {
  "d.ts": "ts",
  "json5": "json",
  "jsonl": "json",
  "log": "txt",
  "mdx": "md",
  "mtsx": "tsx",
  "text": "txt",
  "tsbuildinfo": "json",
  "webmanifest": "json",
};

const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));

const fileIcons = {};
const fileStems = {};
const fileSuffixes = {};
const usedIconFiles = new Set();

function resolveFileIcon(icon) {
  const relativePath = `${FILE_ICON_DIR}/${icon}.svg`;
  const absolutePath = join(ROOT_DIR, relativePath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Missing file icon asset: ${relativePath}`);
  }

  usedIconFiles.add(relativePath);
  return relativePath;
}

function resolveFolderIcon(icon) {
  const relativePath = `${FOLDER_ICON_DIR}/${icon}.svg`;
  const absolutePath = join(ROOT_DIR, relativePath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Missing folder icon asset: ${relativePath}`);
  }

  usedIconFiles.add(relativePath);
  return relativePath;
}

function folderIconExists(icon) {
  return existsSync(join(ROOT_DIR, FOLDER_ICON_DIR, `${icon}.svg`));
}

/** Registers a file icon key once and returns the key. */
function registerFileIcon(icon) {
  if (!fileIcons[icon]) {
    fileIcons[icon] = { path: resolveFileIcon(icon) };
  }

  return icon;
}

function addStem(name, icon) {
  if (!name) return;

  const existing = fileStems[name];
  if (existing && existing !== icon) {
    throw new Error(`Conflicting stem "${name}": "${existing}" vs "${icon}"`);
  }

  fileStems[name] = registerFileIcon(icon);
}

function addSuffix(suffix, icon) {
  if (!suffix) return;

  const existing = fileSuffixes[suffix];
  if (existing && existing !== icon) {
    throw new Error(`Conflicting suffix "${suffix}": "${existing}" vs "${icon}"`);
  }

  fileSuffixes[suffix] = registerFileIcon(icon);
}

// --- Files ----------------------------------------------------------------

const defaultFileId = catalog.defaults.file;
const defaultFileEntry = catalog.files.find((entry) => entry.id === defaultFileId);

if (!defaultFileEntry) {
  throw new Error(`Default file entry "${defaultFileId}" is missing from the catalog`);
}

// Zed falls back to the "default" icon for anything it cannot resolve.
const defaultFileIcon = defaultFileEntry.icon ?? defaultFileEntry.id;
fileIcons.default = { path: resolveFileIcon(defaultFileIcon) };

for (const entry of catalog.files) {
  if (entry.id === defaultFileId) {
    continue;
  }

  const icon = entry.icon ?? entry.id;
  registerFileIcon(icon);

  for (const name of entry.names ?? []) {
    addStem(name, icon);
  }

  for (const extension of entry.extensions ?? []) {
    // Names such as "route.ts" are exact matches; keeping them as suffixes
    // would also match unrelated files like "app-route.ts".
    if (entry.names?.includes(extension)) {
      continue;
    }

    addSuffix(extension, icon);
  }
}

for (const [name, icon] of Object.entries(EXTRA_FILE_STEMS)) {
  addStem(name, icon);
}

for (const [suffix, icon] of Object.entries(EXTRA_FILE_SUFFIXES)) {
  addSuffix(suffix, icon);
}

// --- Folders --------------------------------------------------------------

const defaultFolderId = catalog.defaults.folder;
const defaultFolderEntry = catalog.folders.find((entry) => entry.id === defaultFolderId);

if (!defaultFolderEntry) {
  throw new Error(`Default folder entry "${defaultFolderId}" is missing from the catalog`);
}

const defaultFolderIcon = defaultFolderEntry.icon ?? defaultFolderEntry.id;
const folderIds = new Map(catalog.folders.map((entry) => [entry.id, entry]));

/** Resolves the expanded icon: explicit `expandedId`, then `<icon>-open`, then the icon itself. */
function expandedFolderIcon(entry, icon) {
  if (entry.expandedId) {
    const expandedEntry = folderIds.get(entry.expandedId);

    if (expandedEntry) {
      return expandedEntry.icon ?? expandedEntry.id;
    }

    // Some catalog entries point at generated ids such as "vscode_open"
    // that only exist as assets (`vscode-open.svg`).
    if (entry.expandedId.endsWith("_open")) {
      return entry.expandedId.replace(/_open$/, "-open");
    }

    throw new Error(`Unknown expandedId "${entry.expandedId}" for folder "${entry.id}"`);
  }

  return folderIconExists(`${icon}-open`) ? `${icon}-open` : icon;
}

const namedDirectoryIcons = {};

for (const entry of catalog.folders) {
  if (entry.id === defaultFolderId) {
    continue;
  }

  const icon = entry.icon ?? entry.id;
  const expanded = expandedFolderIcon(entry, icon);
  const icons = {
    collapsed: resolveFolderIcon(icon),
    expanded: resolveFolderIcon(expanded),
  };

  for (const name of entry.names ?? []) {
    if (namedDirectoryIcons[name]) {
      throw new Error(`Duplicate folder name "${name}" in the catalog`);
    }

    namedDirectoryIcons[name] = icons;

    // Zed matches folder names case-sensitively, so register the common
    // capitalized spelling as well ("components" and "Components").
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
    if (capitalized !== name && !namedDirectoryIcons[capitalized]) {
      namedDirectoryIcons[capitalized] = icons;
    }
  }
}

// --- Output ---------------------------------------------------------------

const sortObject = (object) =>
  Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));

const themeFamily = {
  $schema: "https://zed.dev/schema/icon_themes/v0.3.0.json",
  name: THEME_NAME,
  author: "potrepalov (icons by Melissa Gutierrez / Jerry's Pixel Icons)",
  themes: [
    {
      name: THEME_NAME,
      appearance: APPEARANCE,
      directory_icons: {
        collapsed: resolveFolderIcon(defaultFolderIcon),
        expanded: resolveFolderIcon(`${defaultFolderIcon}-open`),
      },
      named_directory_icons: sortObject(namedDirectoryIcons),
      file_stems: sortObject(fileStems),
      file_suffixes: sortObject(fileSuffixes),
      file_icons: sortObject(fileIcons),
    },
  ],
};

// --- Self-check -----------------------------------------------------------

const theme = themeFamily.themes[0];

function verifyIconPath(relativePath, source) {
  if (!relativePath.startsWith("./icons/") || !existsSync(join(ROOT_DIR, relativePath))) {
    throw new Error(`Invalid icon path in ${source}: ${relativePath}`);
  }
}

for (const [key, icon] of Object.entries(theme.file_icons)) {
  verifyIconPath(icon.path, `file_icons.${key}`);
}

for (const [key, value] of Object.entries(theme.file_stems)) {
  if (!theme.file_icons[value]) {
    throw new Error(`file_stems.${key} points to unknown icon key "${value}"`);
  }
}

for (const [key, value] of Object.entries(theme.file_suffixes)) {
  if (!theme.file_icons[value]) {
    throw new Error(`file_suffixes.${key} points to unknown icon key "${value}"`);
  }
}

verifyIconPath(theme.directory_icons.collapsed, "directory_icons.collapsed");
verifyIconPath(theme.directory_icons.expanded, "directory_icons.expanded");

for (const [name, icons] of Object.entries(theme.named_directory_icons)) {
  verifyIconPath(icons.collapsed, `named_directory_icons.${name}.collapsed`);
  verifyIconPath(icons.expanded, `named_directory_icons.${name}.expanded`);
}

writeFileSync(OUTPUT_PATH, `${JSON.stringify(themeFamily, null, 2)}\n`, "utf8");

const summary = [
  `Wrote ${OUTPUT_PATH}`,
  `  file icons:   ${Object.keys(fileIcons).length}`,
  `  file stems:   ${Object.keys(fileStems).length}`,
  `  file suffixes:${Object.keys(fileSuffixes).length}`,
  `  folder names: ${Object.keys(namedDirectoryIcons).length}`,
  `  assets used:  ${usedIconFiles.size}`,
].join("\n");

console.log(summary);
