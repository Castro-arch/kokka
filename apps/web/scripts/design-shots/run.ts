// Screenshots of the admin screens next to the mockups in docs/design/admin (SPEC, "Critério de
// aceite"). Seeds a separate database, starts `next dev` against it on its own port and build
// folder, signs in and shoots each route at 1440×900 and 1280×800.
//
//   pnpm --filter @kokka/web design:shots            all screens
//   pnpm --filter @kokka/web design:shots eventos    only the named screens
//   pnpm --filter @kokka/web design:shots --mobile   also a 390×844 phone shot (no mockup to compare)
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createDb } from "@kokka/db";
import { chromium, type Page } from "playwright";
import { SHOTS_ADMIN, SHOTS_DATABASE, seedShots, type SeededIds } from "./seed.ts";

const PORT = 3100;
const BASE_URL = `http://localhost:${String(PORT)}`;
const webDir = fileURLToPath(new URL("../..", import.meta.url));
const designDir = fileURLToPath(new URL("../../../../docs/design/admin/", import.meta.url));
const implDir = `${designDir}impl/`;

interface Screen {
  name: string;
  path: (ids: SeededIds) => string;
  /** Puts the page in the state the mockup shows (selections, open panels). */
  prepare?: (page: Page) => Promise<void>;
  /** Shoot only the window, for screens whose mockup shows something stuck to its bottom. */
  viewportOnly?: boolean;
}

const SCREENS: Screen[] = [
  { name: "eventos", path: () => "/admin" },
  { name: "evento", path: (ids) => `/admin/eventos/${ids.live}` },
  // States without a mockup: shot for review, not compared.
  { name: "evento-personalizacao", path: (ids) => `/admin/eventos/${ids.live}?aba=personalizacao` },
  { name: "evento-qr", path: (ids) => `/admin/eventos/${ids.live}?aba=qr` },
  {
    name: "evento-encerrar",
    path: (ids) => `/admin/eventos/${ids.live}`,
    prepare: async (page) => {
      await page.getByRole("button", { name: "Encerrar envios" }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  { name: "telao", path: (ids) => `/admin/eventos/${ids.live}/telao` },
  { name: "telao-vazio", path: (ids) => `/admin/eventos/${ids.draft}/telao` },
  {
    name: "midias",
    path: (ids) => `/admin/eventos/${ids.live}/midias`,
    // The mockup has three tiles selected and the bulk bar stuck to the bottom of the window.
    viewportOnly: true,
    prepare: async (page) => {
      const boxes = page.getByRole("checkbox");
      // Click the tile (the label), as a person would; the input itself is visually hidden.
      for (const index of [0, 3, 7]) await boxes.nth(index).locator("xpath=..").click();
      await page.getByRole("toolbar", { name: "Ações em lote" }).waitFor();
    },
  },
  { name: "configuracoes", path: () => "/admin/configuracoes" },
];

interface Size {
  suffix: string;
  width: number;
  height: number;
  /** False for sizes without a mockup. */
  compare: boolean;
}

const SIZES: Size[] = [
  { suffix: "", width: 1440, height: 900, compare: true },
  { suffix: "-1280", width: 1280, height: 800, compare: true },
];

const PHONE: Size = { suffix: "-390", width: 390, height: 844, compare: false };

function shotsDatabaseUrl(): { admin: string; shots: string } {
  const admin = process.env.DATABASE_URL;
  if (!admin) throw new Error("DATABASE_URL is not set");
  const url = new URL(admin);
  url.pathname = `/${SHOTS_DATABASE}`;
  return { admin, shots: url.toString() };
}

async function ensureDatabase(adminUrl: string): Promise<void> {
  const client = createDb(adminUrl, { max: 1, onnotice: () => undefined }).$client;
  try {
    const found = await client`select 1 from pg_database where datname = ${SHOTS_DATABASE}`;
    if (found.length === 0) await client.unsafe(`create database ${SHOTS_DATABASE}`);
  } finally {
    await client.end();
  }
}

function migrate(databaseUrl: string): void {
  const result = spawnSync(process.execPath, ["src/migrate.ts"], {
    cwd: fileURLToPath(new URL("../../../../packages/db/", import.meta.url)),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error("Migrations failed");
}

function startNext(databaseUrl: string): ChildProcess {
  const nextBin = createRequire(`${webDir}package.json`).resolve("next/dist/bin/next");
  return spawn(process.execPath, [nextBin, "dev", "-p", String(PORT)], {
    cwd: webDir,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      APP_URL: BASE_URL,
      // Own build folder inside .next (which the dev watcher ignores; a sibling folder would make
      // every build write trigger a reload), so it runs next to `pnpm dev:web` without conflicts.
      NEXT_DIST_DIR: ".next/shots",
    },
    stdio: ["ignore", "inherit", "inherit"],
  });
}

function stopNext(child: ChildProcess): void {
  if (child.pid === undefined) return;
  // next dev forks its server; on Windows only taskkill /T takes the whole tree down.
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

async function waitForServer(): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("next dev did not answer /api/health within 2 minutes");
}

/** Loads a page and waits for the network to settle (the first visit compiles the route). */
async function open(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle", timeout: 180_000 });
}

const toDataUrl = async (file: string) =>
  `data:image/png;base64,${(await readFile(file)).toString("base64")}`;

/** Reference and implementation in one image, for reviewing a screen at a glance. */
async function compare(page: Page, name: string): Promise<void> {
  const [reference, implemented] = await Promise.all([
    toDataUrl(`${designDir}${name}.png`),
    toDataUrl(`${implDir}${name}.png`),
  ]);
  await page.setViewportSize({ width: 1600, height: 800 });
  await page.setContent(`<!doctype html>
    <body style="margin:0;padding:16px;display:flex;gap:16px;align-items:flex-start;
      font:700 20px system-ui;background:#fff">
      <figure style="margin:0;flex:1"><figcaption>Referência · ${name}</figcaption>
        <img style="width:100%;border:1px solid #ccc" src="${reference}"></figure>
      <figure style="margin:0;flex:1"><figcaption>Implementado · ${name}</figcaption>
        <img style="width:100%;border:1px solid #ccc" src="${implemented}"></figure>
    </body>`);
  await page.screenshot({ path: `${implDir}compare/${name}.png`, fullPage: true });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const only = args.filter((arg) => !arg.startsWith("--"));
  const sizes = args.includes("--mobile") ? [...SIZES, PHONE] : SIZES;
  const screens = only.length ? SCREENS.filter((screen) => only.includes(screen.name)) : SCREENS;
  if (screens.length === 0) throw new Error(`Unknown screen: ${only.join(", ")}`);

  const { admin, shots } = shotsDatabaseUrl();
  await ensureDatabase(admin);
  migrate(shots);
  const ids = await seedShots(shots);
  await mkdir(`${implDir}compare`, { recursive: true });

  const next = startNext(shots);
  const browser = await chromium.launch();
  try {
    await waitForServer();
    const context = await browser.newContext({ locale: "pt-BR", reducedMotion: "reduce" });
    // Screenshots need no hot reload. Without this, a watcher event (a type generation or a
    // formatter run just before) makes the dev client reload the page in a loop.
    await context.routeWebSocket(/\/_next\/webpack-hmr/, () => undefined);
    const signIn = await context.request.post(`${BASE_URL}/api/auth/sign-in/email`, {
      headers: { origin: BASE_URL },
      data: { email: SHOTS_ADMIN.email, password: SHOTS_ADMIN.password },
    });
    if (!signIn.ok()) throw new Error(`Sign-in failed: ${String(signIn.status())}`);

    const page = await context.newPage();
    for (const screen of screens) {
      for (const size of sizes) {
        await page.setViewportSize({ width: size.width, height: size.height });
        await open(page, `${BASE_URL}${screen.path(ids)}`);
        // The dev-only Next.js badge is not part of the design.
        await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
        await page.evaluate(() => document.fonts.ready);
        await screen.prepare?.(page);
        // The mockups are rendered at their full height; grow the viewport to match, so the
        // sticky full-height sidebar spans the whole page as it does there.
        if (!screen.viewportOnly) {
          const height = await page.evaluate(() => document.documentElement.scrollHeight);
          await page.setViewportSize({ width: size.width, height: Math.max(size.height, height) });
        }
        const file = `${implDir}${screen.name}${size.suffix}.png`;
        await page.screenshot({ path: file, fullPage: !screen.viewportOnly });
        console.log(`saved ${file}`);
        const name = `${screen.name}${size.suffix}`;
        if (size.compare && existsSync(`${designDir}${name}.png`)) await compare(page, name);
      }
    }
  } finally {
    await browser.close();
    stopNext(next);
  }
}

await main();
