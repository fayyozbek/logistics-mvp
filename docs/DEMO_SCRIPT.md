# Stakeholder demo script — Logistix MVP

**Deployed URLs**

| Layer | URL |
|-------|-----|
| Frontend (Vercel) | https://logistics-mvp-sigma.vercel.app |
| Backend API (Render) | https://logistics-mvp.onrender.com/api |
| Health check | https://logistics-mvp.onrender.com/api/health |

**Audience:** internal stakeholders evaluating product direction.  
**Mode:** shared demo view — no login, no roles, single operator screen.  
**Duration:** ~15–20 minutes (plus 2–3 minutes wake-up if backend was idle).

---

## 1. Pre-demo checklist

Run this **30–60 minutes before** the meeting. Do not start the live demo until every item passes.

| # | Check | How | Pass criteria |
|---|--------|-----|----------------|
| 1 | Backend awake | `curl -s https://logistics-mvp.onrender.com/api/health` | `{"status":"ok"}` within ~30s (first call after sleep may take longer) |
| 2 | Frontend opens | Open https://logistics-mvp-sigma.vercel.app (hard refresh: Cmd+Shift+R) | Dashboard loads; no blank screen |
| 3 | Live API, not mock | DevTools → Network | Requests go to `logistics-mvp.onrender.com/api`, not `localhost`; no silent fallback to mock |
| 4 | No CORS errors | DevTools → Console | No `Access-Control` / blocked-by-CORS messages |
| 5 | Database clean | API or UI spot-check | **6** canonical shipments only; **no** `LGX-2026-0562`, `0563`, `0564`, or cargo containing QA/Browser/REG/Test |
| 6 | Dropdowns clean | Shipments → **Новый груз** | Client list: **5** companies (no repeated names); manager list: **4** names (no 80-row list) |
| 7 | Finance consistent | Finance page or `GET /api/finance` | Paid rows: `paid_amount = total`; partial: `0 < paid < total`; unpaid/overdue: `paid = 0` |
| 8 | Render env | Render dashboard | `RUN_SEEDERS=false` after initial seed (avoids reset on restart) |
| 9 | Optional warm-up | Hit health + dashboard once | Reduces first-click latency during demo |

**Canonical demo shipments** (after DB cleanup):

| Tracking | Route | Status | Good for |
|----------|-------|--------|----------|
| LGX-2026-0421 | Алматы → Ташкент | Доставлен | Completed example |
| LGX-2026-0498 | Алматы → Франкфурт | В пути | Active + tracking timeline |
| LGX-2026-0512 | Шанхай → Актау | В пути | Sea / multi-checkpoint |
| LGX-2026-0387 | Москва → Алматы | Задержка | Exception state |
| LGX-2026-0533 | Париж → Алматы | Доставлен | Intermodal + paid finance |
| LGX-2026-0561 | Алматы → Дубай | Запланирован | Planned / upcoming |

If checklist item 5–7 fails, run **DB-CLEANUP-001** and **DB-VERIFY-001** before the demo.

---

## 2. Demo flow (step-by-step)

### Opening (1 min)

> «Это MVP админ-панели Logistix для B2B-логистики: дашборд, грузы, трекинг, финансы и настройки Telegram. Сейчас один общий доступ без логина — роли и авторизация следующий этап после вашей обратной связи.»

---

### Step 1 — Dashboard (2–3 min)

1. Open **Дашборд** (default landing).
2. Point out KPI cards:
   - **Месячный оборот** — invoiced volume across demo shipments.
   - **Пришло денег** — collected amount (MVP accounting, not a bank feed).
   - **Активные грузы** / **Завершено** — operational split.
   - **К получению** — outstanding receivables.
3. Briefly scroll charts: shipments by month, turnover vs payments, routes, manager delay widget.

**Say:** «Все цифры сейчас из нашей демо-базы на Render PostgreSQL; после интеграции с 1С/банком KPI будут из реальных источников.»

---

### Step 2 — Shipments list & detail (2 min)

1. Go to **Грузы**.
2. Confirm the table shows **six** clean rows (tracking numbers above).
3. Click **LGX-2026-0498** (медицинское оборудование, в пути).
4. Show detail panel: client, manager, route, status stepper, checkpoints summary.

**Do not** open **Менеджеры**, **Пользователи**, **Архив**, or **Настройки** (company profile).

---

### Step 3 — Create shipment (3–4 min)

1. Click **Новый груз**.
2. Fill with **professional demo data** (avoid QA/Test in cargo name):

   | Field | Suggested value |
   |-------|-----------------|
   | Клиент | KazExport LLP |
   | Менеджер | Дина Сейткали *(or «Не назначен»)* |
   | Тип перевозки | Авто |
   | Откуда | Алматы |
   | Куда | Астана |
   | Груз | Офисная техника |
   | Вес / Объём | 1 200 кг / 8 м³ *(optional)* |

3. Click **Создать груз**.
4. Show generated **tracking number** (e.g. `LGX-2026-0566`) in the success/detail view.
5. Confirm the new row appears at the top of the list.

**Say:** «Номер трекинга генерируется автоматически; запись сразу попадает в API и в список грузов.»

---

### Step 4 — Status update (2 min)

1. With the **newly created** shipment selected, use the status stepper or **Статус** dropdown.
2. Change **Запланирован** → **В пути**.
3. Click **Сохранить статус**.
4. Point out badge/stepper update in list and detail.

**Say:** «Статусы пишутся в базу через API; клиентский портал и уведомления подключим позже.»

---

### Step 5 — Tracking: checkpoint add & update (4 min)

1. Go to **Отслеживание**.
2. Select the **shipment you just created** (or **LGX-2026-0498** if you prefer a richer baseline).
3. **Add checkpoint:**
   - **Добавить новую точку маршрута**
   - City: **Астана** (quick-pick) or type city
   - Address: e.g. `Терминал Астана-1`
   - Planned time: pick a near-future slot
   - **+ Добавить точку в маршрут**
4. Show new point on the timeline.
5. **Update checkpoint:** change an existing point status (e.g. **Плановая** → **Текущая**) via the row control; save if prompted.
6. Show timeline/progress update.

**Say:** «Маршрут — цепочка контрольных точек; менеджер может добавлять хабы и менять статус точки без пересоздания груза.»

---

### Step 6 — Finance (3 min)

1. Go to **Финансы**.
2. Show summary cards: invoiced, paid, debt, overdue.
3. Open a **clean** record — e.g. **INV-2** (Global Trade GmbH, partial) or **INV-6** (KazExport, partial).
4. Explain line items (фрахт, таможня, страховка).
5. If appropriate, change status (e.g. partial → paid) and show **Оплачено** / debt column update.

**Say:** «Это MVP-учёт статуса счёта, не платёжный шлюз. Мы фиксируем оплачено/долг для операционной картины; интеграция с банком и 1С — отдельный этап.»

**Do not** click PDF download or export placeholders.

---

### Step 7 — Telegram settings (2 min)

1. Go to **Telegram-бот**.
2. Show connected state, masked token, chat ID.
3. Toggle one **event flag** (e.g. документы / docs).
4. Click **Сохранить настройки**; confirm success state.
5. Optional: hard refresh — settings still saved.

**Say:** «Настройки сохраняются в API. Реальная отправка в Telegram-канал клиента — следующий спринт; журнал событий на экране пока демо-UI.»

**Do not** promise live bot messages during this demo.

---

### Closing (1 min)

> «Мы показали сквозной цикл: создать груз → статус → трекинг → финансы → настройки уведомлений. Следующий фокус — редактирование/удаление груза, индикатор недоступности API, автотесты и авторизация после вашего решения по продукту.»

---

## 3. Pages and features to avoid

| Avoid | Reason |
|-------|--------|
| **Пользователи** | Mock / placeholder; not production-ready |
| **Архив** | Not in MVP scope for this demo |
| **Настройки** (company profile) | Placeholder branding fields |
| Finance **PDF** / download | Not implemented |
| **Менеджеры** (80-card list) | Only if DB not deduped; skip even when clean unless asked |
| Any row with QA / Browser / Test cargo | Pollutes stakeholder narrative |
| Explaining mock fallback | Only relevant when API is down — fix backend instead |

---

## 4. Phrases for MVP limitations

Use these when stakeholders ask «а это уже работает?»

| Topic | Suggested phrase |
|-------|------------------|
| **No login / roles** | «Сейчас общий демо-доступ для презентации. Роли менеджер/клиент/админ и разграничение данных — после того как вы подтвердите приоритеты экранов.» |
| **No real payments** | «Финансы — статус и суммы в системе, не списание с карты и не банковская выписка.» |
| **No real Telegram delivery** | «Бот сохраняет настройки; фактическая доставка сообщений в Telegram подключится отдельно.» |
| **No edit/delete shipment** | «Создание и смена статуса есть; полное редактирование и удаление груза — в ближайшем бэклоге после демо.» |
| **Free hosting wake-up** | «Бэкенд на бесплатном Render может “засыпать”; первый запрос после паузы 20–60 секунд — это инфраструктура, не баг приложения.» |
| **Postgres lifetime** | «Демо-база на free tier Render; для production нужен платный план и резервное копирование.» |
| **API offline / mock** | «Если API недоступен, интерфейс может показать офлайн-данные — для демо мы всегда прогреваем health заранее.» |

---

## 5. Post-demo priorities (share with stakeholders)

Ordered backlog to mention if asked «что дальше?»:

1. **Edit shipment** — update route, client, cargo after create.
2. **Delete shipment** — remove mistaken or test rows safely.
3. **Visible API offline indicator** — no silent mock fallback in production demos.
4. **Smoke automation** — repeat this script in CI against staging/production.
5. **Auth & roles** — after product direction sign-off (manager vs client vs admin).

---

## 6. Troubleshooting during live demo

| Symptom | Quick fix |
|---------|-----------|
| Blank KPIs / empty tables | Wake API: open `/api/health`; wait; hard refresh frontend |
| CORS error in console | Check Render `FRONTEND_URL` matches Vercel URL exactly |
| Duplicate clients in dropdown | DB not cleaned — postpone demo; run cleanup SQL |
| «Сохранение…» hangs | Render cold start; retry after 30s |
| Wrong finance totals | Run finance consistency fix in DB cleanup |

---

## 7. Reference — demo data counts (clean DB)

| Entity | Expected count |
|--------|----------------|
| Clients | 5 |
| Managers | 4 |
| Shipments | 6 (canonical) + any you create live |
| Finance records | 6 |
| Telegram settings | 1 row (`id=1`) |

---

*Last updated for deployed MVP on Vercel + Render. Align with `docs/PROJECT_CONTEXT.md` and deployment steps in `README.md`.*
