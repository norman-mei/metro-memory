#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const DEFAULT_VERCEL_ENVS = ["development", "preview", "production"];
const WATCH_DEBOUNCE_MS = 750;
const DEFAULT_ENV_FILES = [".env.local", ".env"];

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const envPath = options.file
    ? path.resolve(process.cwd(), options.file)
    : resolveDefaultEnvFile(process.cwd());
  assertFileExists(envPath);

  if (options.codespaces && options.codespacesRepos.length === 0) {
    const inferredRepo = await inferGithubRepo();
    if (inferredRepo) {
      options.codespacesRepos = [inferredRepo];
    }
  }

  ensureTargetsSelected(options);

  if (options.watch) {
    await runSync(envPath, options);
    watchEnvFile(envPath, options);
    return;
  }

  await runSync(envPath, options);
}

function parseArgs(args) {
  const options = {
    file: null,
    dryRun: false,
    watch: false,
    codespaces: true,
    vercel: true,
    codespacesRepos: [],
    vercelEnvs: [...DEFAULT_VERCEL_ENVS],
    vercelYes: true,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--watch") {
      options.watch = true;
      continue;
    }

    if (arg === "--no-codespaces") {
      options.codespaces = false;
      continue;
    }

    if (arg === "--no-vercel") {
      options.vercel = false;
      continue;
    }

    if (arg === "--codespaces-only") {
      options.codespaces = true;
      options.vercel = false;
      continue;
    }

    if (arg === "--vercel-only") {
      options.codespaces = false;
      options.vercel = true;
      continue;
    }

    if (arg === "--file") {
      options.file = requireNextValue(args, ++index, "--file");
      continue;
    }

    if (arg === "--codespaces-repo") {
      options.codespacesRepos.push(requireNextValue(args, ++index, "--codespaces-repo"));
      continue;
    }

    if (arg === "--codespaces-repos") {
      options.codespacesRepos.push(
        ...splitCsv(requireNextValue(args, ++index, "--codespaces-repos"))
      );
      continue;
    }

    if (arg === "--vercel-env") {
      options.vercelEnvs = [requireNextValue(args, ++index, "--vercel-env")];
      continue;
    }

    if (arg === "--vercel-envs") {
      options.vercelEnvs = splitCsv(requireNextValue(args, ++index, "--vercel-envs"));
      continue;
    }

    if (arg === "--no-vercel-yes") {
      options.vercelYes = false;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  options.codespacesRepos = normalizeRepoList(options.codespacesRepos);
  options.vercelEnvs = normalizeVercelEnvList(options.vercelEnvs);

  return options;
}

function resolveDefaultEnvFile(cwd) {
  for (const filename of DEFAULT_ENV_FILES) {
    const candidate = path.resolve(cwd, filename);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(cwd, DEFAULT_ENV_FILES[0]);
}

function requireNextValue(args, index, flag) {
  const value = args[index];
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function splitCsv(value) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeRepoList(repos) {
  return Array.from(new Set(repos.map((repo) => repo.trim()).filter(Boolean)));
}

function normalizeVercelEnvList(envs) {
  const normalized = Array.from(
    new Set(
      envs.map((env) => env.trim().toLowerCase()).filter(Boolean)
    )
  );

  for (const env of normalized) {
    if (!DEFAULT_VERCEL_ENVS.includes(env)) {
      throw new Error(
        `Unsupported Vercel environment "${env}". Use development, preview, or production.`
      );
    }
  }

  return normalized;
}

function assertFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Env file not found: ${filePath}`);
  }
}

function ensureTargetsSelected(options) {
  if (!options.codespaces && !options.vercel) {
    throw new Error("No sync target selected. Remove --no-codespaces/--no-vercel or choose one target.");
  }

  if (options.codespaces && options.codespacesRepos.length === 0) {
    throw new Error(
      "Codespaces sync requires at least one repository via --codespaces-repo or --codespaces-repos. Auto-detection from git origin also works when available."
    );
  }
}

async function runSync(envPath, options) {
  const envEntries = parseEnvFile(fs.readFileSync(envPath, "utf8"));

  if (envEntries.length === 0) {
    throw new Error(`No variables found in ${envPath}`);
  }

  console.log(
    `Syncing ${envEntries.length} variable${envEntries.length === 1 ? "" : "s"} from ${path.basename(envPath)}`
  );

  if (options.codespaces) {
    if (!options.dryRun) {
      await ensureCommandAvailable("gh");
    }
    await syncCodespaces(envEntries, options);
  }

  if (options.vercel) {
    if (!options.dryRun) {
      await ensureCommandAvailable("vercel");
    }
    await syncVercel(envEntries, options);
  }

  console.log("Sync complete.");
}

function watchEnvFile(envPath, options) {
  console.log(`Watching ${envPath} for changes...`);

  let timeoutId = null;
  let running = false;
  let rerunRequested = false;

  const triggerSync = async () => {
    if (running) {
      rerunRequested = true;
      return;
    }

    running = true;
    try {
      await runSync(envPath, options);
    } catch (error) {
      console.error(error.message);
    } finally {
      running = false;
      if (rerunRequested) {
        rerunRequested = false;
        await triggerSync();
      }
    }
  };

  fs.watchFile(envPath, { interval: 1000 }, () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      void triggerSync();
    }, WATCH_DEBOUNCE_MS);
  });
}

function parseEnvFile(contents) {
  const entries = [];
  const lines = contents.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const normalizedLine = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length)
      : trimmed;

    const separatorIndex = normalizedLine.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalizedLine.slice(0, separatorIndex).trim();
    const rawValue = normalizedLine.slice(separatorIndex + 1);

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    entries.push({
      key,
      value: parseEnvValue(rawValue),
    });
  }

  return entries;
}

function parseEnvValue(rawValue) {
  const value = rawValue.trim();

  if (!value) {
    return "";
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    const unwrapped = value.slice(1, -1);
    if (value.startsWith('"')) {
      return unwrapped
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
    return unwrapped.replace(/\\'/g, "'");
  }

  const inlineCommentIndex = findInlineCommentStart(value);
  if (inlineCommentIndex >= 0) {
    return value.slice(0, inlineCommentIndex).trimEnd();
  }

  return value;
}

function findInlineCommentStart(value) {
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "#") {
      continue;
    }

    if (index === 0 || /\s/.test(value[index - 1])) {
      return index;
    }
  }
  return -1;
}

async function syncCodespaces(entries, options) {
  console.log(
    `Updating GitHub Codespaces user secrets for repos: ${options.codespacesRepos.join(", ")}`
  );

  for (const entry of entries) {
    const args = [
      "secret",
      "set",
      entry.key,
      "--user",
      "--app",
      "codespaces",
      "--repos",
      options.codespacesRepos.join(","),
    ];

    await runCommand("gh", args, {
      stdin: `${entry.value}\n`,
      dryRun: options.dryRun,
      mask: entry.key,
    });
  }
}

async function syncVercel(entries, options) {
  console.log(`Updating Vercel environments: ${options.vercelEnvs.join(", ")}`);

  for (const targetEnv of options.vercelEnvs) {
    for (const entry of entries) {
      const args = ["env", "add", entry.key, targetEnv, "--force"];

      if (options.vercelYes) {
        args.push("--yes");
      }

      await runCommand("vercel", args, {
        stdin: `${entry.value}\n`,
        dryRun: options.dryRun,
        mask: `${entry.key} (${targetEnv})`,
      });
    }
  }
}

async function ensureCommandAvailable(command) {
  await runCommand(command, ["--version"], { quiet: true });
}

async function inferGithubRepo() {
  if (process.env.GITHUB_REPOSITORY && isRepoSlug(process.env.GITHUB_REPOSITORY)) {
    return process.env.GITHUB_REPOSITORY;
  }

  try {
    const gitConfigPath = path.resolve(process.cwd(), ".git", "config");
    const gitConfig = fs.readFileSync(gitConfigPath, "utf8");
    const remote = extractOriginUrlFromGitConfig(gitConfig);
    return parseGithubRepoFromRemote(remote);
  } catch {
    return null;
  }
}

function isRepoSlug(value) {
  return /^[^/\s]+\/[^/\s]+$/.test(value);
}

function parseGithubRepoFromRemote(remote) {
  const trimmed = (remote || "").trim();
  if (!trimmed) {
    return null;
  }

  const sshMatch = trimmed.match(/^git@github\.com:([^/\s]+\/[^/\s]+?)(?:\.git)?$/i);
  if (sshMatch) {
    return sshMatch[1];
  }

  const httpsMatch = trimmed.match(/^https?:\/\/github\.com\/([^/\s]+\/[^/\s]+?)(?:\.git)?$/i);
  if (httpsMatch) {
    return httpsMatch[1];
  }

  return null;
}

function extractOriginUrlFromGitConfig(contents) {
  const lines = contents.split(/\r?\n/);
  let inOriginSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      inOriginSection = trimmed === '[remote "origin"]';
      continue;
    }

    if (!inOriginSection) {
      continue;
    }

    const match = trimmed.match(/^url\s*=\s*(.+)$/i);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

function runCommand(command, args, options = {}) {
  const { stdin, dryRun = false, quiet = false, mask = null } = options;

  if (dryRun) {
    const label = mask ? ` [${mask}]` : "";
    console.log(`[dry-run] ${command} ${args.join(" ")}${label}`);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", quiet ? "ignore" : "inherit", quiet ? "ignore" : "inherit"],
    });

    child.on("error", (error) => {
      reject(
        new Error(
          `Failed to start "${command}". Install it and authenticate before running sync.`
        )
      );
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed (${code}): ${command} ${args.join(" ")}`));
    });

    if (typeof stdin === "string") {
      child.stdin.write(stdin);
    }

    child.stdin.end();
  });
}

function printHelp() {
  console.log(`Usage:
  node scripts/sync-env.js [options]

Options:
  --file <path>                 Env file to read. Default: .env.local, then .env
  --codespaces-repo <owner/repo>
  --codespaces-repos <a/b,c/d>  Comma-separated repo list for Codespaces user secrets
  --vercel-env <name>           One Vercel environment: development|preview|production
  --vercel-envs <csv>           Default: development,preview,production
  --codespaces-only             Sync only GitHub Codespaces
  --vercel-only                 Sync only Vercel
  --no-codespaces               Disable Codespaces sync
  --no-vercel                   Disable Vercel sync
  --watch                       Re-sync after local .env changes
  --dry-run                     Print commands without changing remote state
  --no-vercel-yes               Do not pass --yes to Vercel CLI
  --help                        Show this help

Notes:
  - Local .env.local (or .env) is the canonical source of truth.
  - When --codespaces-repo is omitted, the script tries GITHUB_REPOSITORY, then git remote.origin.url.
  - Codespaces sync updates GitHub Codespaces user secrets for the selected repo(s).
  - Vercel sync upserts the same keys into the selected Vercel environment(s).
  - Existing terminals or running processes will not hot-reload new env vars automatically.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
