import { chromium } from "playwright";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const APP_URL = process.env.APP_URL || "http://127.0.0.1:5175";
const LANDING_URL = process.env.LANDING_URL || "http://127.0.0.1:5174";
const OUTPUT_DIR = path.resolve(".artifacts/visual-qa");
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

const patient = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Elena García",
  timezone: "America/Guayaquil",
  created_by: "22222222-2222-4222-8222-222222222222",
  created_at: "2026-07-01T12:00:00.000Z",
};

const medications = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Enalapril",
    dose: "1 tableta de 10 mg",
    instructions: "Después de comer",
    starts_on: "2026-07-01",
    ends_on: null,
    active: true,
    medication_schedules: [
      {
        id: "44444444-4444-4444-8444-444444444441",
        local_time: "08:00:00",
        days_of_week: [0, 1, 2, 3, 4, 5, 6],
        timezone: "America/Guayaquil",
        active: true,
      },
      {
        id: "44444444-4444-4444-8444-444444444442",
        local_time: "20:00:00",
        days_of_week: [1, 2, 3, 4, 5],
        timezone: "America/Guayaquil",
        active: true,
      },
    ],
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    name: "Metformina",
    dose: "850 mg",
    instructions: "Con la cena",
    starts_on: "2026-07-01",
    ends_on: null,
    active: true,
    medication_schedules: [{
      id: "66666666-6666-4666-8666-666666666666",
      local_time: "19:30:00",
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      timezone: "America/Guayaquil",
      active: true,
    }],
  },
];

function doseEvents() {
  const now = new Date();
  return [0, 1, 2].map((daysAgo) => {
    const scheduled = new Date(now);
    scheduled.setDate(now.getDate() - daysAgo);
    scheduled.setHours(8, 0, 0, 0);
    const confirmed = daysAgo !== 1;
    return {
      id: `77777777-7777-4777-8777-77777777777${daysAgo}`,
      patient_id: patient.id,
      scheduled_for: scheduled.toISOString(),
      status: confirmed ? "confirmed" : "missed",
      confirmed_at: confirmed ? scheduled.toISOString() : null,
      notes: null,
      created_at: scheduled.toISOString(),
      medications: { name: daysAgo === 2 ? "Metformina" : "Enalapril", dose: "10 mg" },
      evidence: confirmed ? [{
        id: `88888888-8888-4888-8888-88888888888${daysAgo}`,
        type: "text",
        text_content: "Confirmado por WhatsApp",
        created_at: scheduled.toISOString(),
      }] : [],
    };
  });
}

async function mockSupabase(page) {
  await page.addInitScript((fixtureUser) => {
    localStorage.setItem("sm_auth_session", JSON.stringify({
      access_token: "visual-qa-token",
      refresh_token: "visual-qa-refresh",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: fixtureUser,
    }));
  }, {
    id: "22222222-2222-4222-8222-222222222222",
    email: "maria@sincromed.test",
    user_metadata: { full_name: "María García", phone: "593987654321" },
  });

  await page.route("**/rest/v1/**", async (route) => {
    const url = new URL(route.request().url());
    let body = [];
    if (url.pathname.endsWith("/rpc/sync_dose_events")) body = 0;
    else if (url.pathname.endsWith("/rpc/get_patient_access")) {
      body = {
        currentRole: "owner",
        members: [{
          userId: "22222222-2222-4222-8222-222222222222",
          name: "María García",
          email: "maria@sincromed.test",
          role: "owner",
          joinedAt: "2026-07-01T12:00:00.000Z",
        }, {
          userId: "99999999-9999-4999-8999-999999999999",
          name: "Carlos García",
          email: "carlos@sincromed.test",
          role: "viewer",
          joinedAt: "2026-07-02T12:00:00.000Z",
        }],
        invitations: [{
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          email: "ana@sincromed.test",
          role: "viewer",
          expiresAt: "2026-08-01T12:00:00.000Z",
          createdAt: "2026-07-24T12:00:00.000Z",
        }],
      };
    } else if (url.pathname.endsWith("/patients")) body = [patient];
    else if (url.pathname.endsWith("/patient_caregivers")) {
      body = [{
        whatsapp_status: "connected",
        active: true,
        caregivers: {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          full_name: "Rosa Mendoza",
          phone: "593991112233",
        },
      }];
    } else if (url.pathname.endsWith("/medications")) body = medications;
    else if (url.pathname.endsWith("/dose_events")) body = doseEvents();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

async function assertPageQuality(page, label) {
  await page.waitForTimeout(750);
  const issues = await page.evaluate(() => {
    const problems = [];
    if (document.documentElement.scrollWidth > window.innerWidth + 1) {
      problems.push(`horizontal overflow ${document.documentElement.scrollWidth}px > ${window.innerWidth}px`);
    }

    document.querySelectorAll("button").forEach((button) => {
      const name = button.getAttribute("aria-label")
        || button.getAttribute("title")
        || button.textContent?.trim();
      if (!name) problems.push("button without accessible name");
    });

    document.querySelectorAll("input:not([type='hidden']):not([hidden]), select, textarea").forEach((control) => {
      const id = control.getAttribute("id");
      const labelled = control.getAttribute("aria-label")
        || control.getAttribute("aria-labelledby")
        || control.closest("label")
        || (id && document.querySelector(`label[for="${CSS.escape(id)}"]`));
      if (!labelled) problems.push(`${control.tagName.toLowerCase()} without accessible label`);
    });

    document.querySelectorAll("main input, main select, main button").forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1)) {
        problems.push(`${element.tagName.toLowerCase()} outside viewport`);
      }
    });
    return [...new Set(problems)];
  });
  if (issues.length) throw new Error(`${label}: ${issues.join("; ")}`);
}

async function revealScrollableContent(page) {
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < pageHeight; y += 500) {
    await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), y);
    await page.waitForTimeout(40);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
}

async function assertScheduleDayInheritance(page, viewportName) {
  const medication = page.locator(".sm-medication-editor").first();
  const scheduleRows = medication.locator(".sm-schedule-row");
  await scheduleRows.first().waitFor({ state: "attached" });
  const previousCount = await scheduleRows.count();
  const previousDays = await scheduleRows
    .nth(previousCount - 1)
    .locator("[aria-pressed='true']")
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")));

  await medication.getByRole("button", { name: "Agregar horario" }).click();
  await scheduleRows.nth(previousCount).waitFor({ state: "attached" });

  const nextCount = await scheduleRows.count();
  if (nextCount !== previousCount + 1) {
    throw new Error(
      `${viewportName} schedule count changed from ${previousCount} to ${nextCount}`,
    );
  }

  const addedSchedule = scheduleRows.nth(nextCount - 1);
  const inheritedDays = await addedSchedule
    .locator("[aria-pressed='true']")
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")));
  const addedTime = await addedSchedule.locator("input[type='time']").inputValue();

  if (JSON.stringify(inheritedDays) !== JSON.stringify(previousDays) || addedTime !== "") {
    throw new Error(`${viewportName} new schedule did not inherit only the previous days`);
  }

  await addedSchedule.getByRole("button", { name: "Eliminar horario" }).click();
}

async function captureDashboard(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await mockSupabase(page);
  await page.goto(APP_URL, { waitUntil: "networkidle" });

  const tabs = ["Resumen", "Plan", "Evidencias", "Personas", "Ajustes"];
  for (const tabName of tabs) {
    await page.getByRole("tab", { name: tabName }).click();
    if (tabName === "Plan") await assertScheduleDayInheritance(page, viewport.name);
    await assertPageQuality(page, `${viewport.name} ${tabName}`);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${viewport.name}-${tabName.toLowerCase()}.png`),
      fullPage: true,
    });

    if (tabName === "Evidencias") {
      const textEvidence = page.getByRole("button", { name: "Ver texto" }).first();
      await textEvidence.click();
      await assertPageQuality(page, `${viewport.name} visor de evidencia`);
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `${viewport.name}-evidencia-modal.png`),
        fullPage: false,
      });
      await page.getByRole("button", { name: "Cerrar evidencia" }).click();
    }
  }

  if (consoleErrors.length) {
    throw new Error(`${viewport.name} dashboard console errors: ${consoleErrors.join(" | ")}`);
  }
  await context.close();
}

async function captureLanding(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(LANDING_URL, { waitUntil: "networkidle" });
  await revealScrollableContent(page);
  await assertPageQuality(page, `${viewport.name} landing`);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${viewport.name}-landing.png`),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await assertPageQuality(page, `${viewport.name} autenticación`);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${viewport.name}-auth.png`),
    fullPage: false,
  });
  await page.getByRole("button", { name: "Cerrar" }).click();
  await context.close();
}

await rm(OUTPUT_DIR, { recursive: true, force: true });
await mkdir(OUTPUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath });
try {
  for (const viewport of viewports) {
    await captureLanding(browser, viewport);
    await captureDashboard(browser, viewport);
  }
} finally {
  await browser.close();
}

console.log(`Visual QA passed for ${viewports.length} viewports. Screenshots: ${OUTPUT_DIR}`);
