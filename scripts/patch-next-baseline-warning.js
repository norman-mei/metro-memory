#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  process.cwd(),
  'node_modules',
  'next',
  'dist',
  'compiled',
  'browserslist',
  'index.js'
);

const marker = 'BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA';
const warningToken = '[baseline-browser-mapping] The data in this module is over two months old.';
const verbose = process.env.PATCH_NEXT_BASELINE_WARNING_VERBOSE === '1';
const log = (...args) => {
  if (verbose) {
    console.log(...args);
  }
};

if (!fs.existsSync(targetFile)) {
  log('[patch-next-baseline-warning] next bundled browserslist not found, skipping');
  process.exit(0);
}

const source = fs.readFileSync(targetFile, 'utf8');

if (source.includes(marker)) {
  log('[patch-next-baseline-warning] already patched');
  process.exit(0);
}

const tokenIndex = source.indexOf(warningToken);
if (tokenIndex === -1) {
  log('[patch-next-baseline-warning] warning token not found, skipping');
  process.exit(0);
}

const statementStart = source.lastIndexOf(';', tokenIndex);
const statementEnd = source.indexOf(';const ', tokenIndex);

if (statementStart === -1 || statementEnd === -1 || statementEnd <= statementStart) {
  log('[patch-next-baseline-warning] warning statement boundaries not found, skipping');
  process.exit(0);
}

const originalStatement = source.slice(statementStart + 1, statementEnd + 1);
const patchedStatement =
  '(process.env.BROWSERSLIST_IGNORE_OLD_DATA||process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA)||' +
  originalStatement;
const patched =
  source.slice(0, statementStart + 1) + patchedStatement + source.slice(statementEnd + 1);

fs.writeFileSync(targetFile, patched, 'utf8');
log('[patch-next-baseline-warning] patched next bundled baseline warning guard');
