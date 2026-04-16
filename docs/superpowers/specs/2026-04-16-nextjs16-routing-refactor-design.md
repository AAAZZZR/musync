# MuSync Frontend Refactor — Next.js 16 + Multi-page Routing + shadcn/ui

**日期**：2026-04-16
**狀態**：Approved（待轉 implementation plan）
**作者**：Rudy + Claude (brainstorming session)

---

## 1. 動機與目標

當前 frontend 的問題：

- 整個 app 只有一個 `/` page，`HomePage` 一個 client component **450 行**，把 auth、profile、composer、player、library、jobs、focus sessions 全塞進去
- 十幾個 `useState` 全堆在 `HomePage`，再用 props drilling 灌進四個子 panel（`AuthPanel` 一個 component 吃 16 個 props）
- 沒有 route 邊界，登入/未登入畫的是同一頁的不同分支，URL 不會變
- API 呼叫散在 `HomePage` 各處，沒有快取、沒有 loading skeleton、沒有錯誤邊界
- `package.json` 是 Next 14.2.5 + React 18，使用者要求升到 Next 16

**目標**：

1. 升級到 Next.js 16 / React 19
2. 切成多頁路由 (`/app/dashboard`、`/app/play`、`/app/library`、`/app/sessions`、`/app/settings`)
3. 採用 RSC + Server Actions + httpOnly cookie 的安全 auth 模型
4. 引入 shadcn/ui 取代手刻 panel
5. 全域 audio player 跨頁不中斷
6. 加入 Google OAuth（與 email/password 並存）
7. 加入最小核心測試（vitest unit + playwright e2e）

---

## 2. Scope

### In scope

- Frontend 全面重構（架構、路由、UI primitives、state、testing）
- Backend **小幅** 改動：新增 `POST /api/auth/google` endpoint、`google-auth` dependency、`User.password` 改 Optional
- Zeabur 部署設定（env 補上 `NEXT_PUBLIC_APP_URL`、`API_BASE_URL`、`GOOGLE_CLIENT_ID`）
- 完成後 push 到 `main`，由 Zeabur auto deploy

### Out of scope

- Backend 持久化（仍維持 in-memory）
- 密碼 hashing（仍 plain text — 既存技術債，另開 spec）
- 真的接 ACE 1.5 model（仍回 sample mp3）
- Stripe 付費（之後再做，但保留 hook point）
- GitHub Actions CI（Zeabur 自動部署即可）
- 視覺重設計（保留 mint/sky/ink 主題，映射到 shadcn CSS variables）

### Future considerations（先記下，這次不做）

- 加 Stripe 時要插入：`/pricing` route、`/api/stripe/checkout`、`/api/stripe/webhook`、middleware 加 webhook 豁免、`Profile` schema 加 `plan` / `credits` 欄位
- Backend 換 Postgres（Supabase 或自架）+ 密碼 hashing（bcrypt / argon2）
- ACE 1.5 真實整合（async job + WebSocket / polling 通知）

---

## 3. Tech Stack（決議）

| 類別 | 選擇 | 理由 |
|---|---|---|
| Framework | Next.js 16（App Router） | 使用者指定 |
| React | 19 | Next 16 強制 |
| UI library | shadcn/ui + Radix | 使用者指定，長期最強 |
| Styling | Tailwind CSS（保留現有 mint/sky/ink theme，映射到 shadcn CSS variables） | 維持品牌感 + 用 shadcn primitives |
| Forms | react-hook-form + zod | shadcn `<Form>` 標配 |
| Client state（player） | zustand | 跨多 component 讀寫 player state，~1KB |
| Server state | RSC + Server Actions（不加 React Query） | RSC + `revalidatePath` 已能處理 |
| Auth token storage | httpOnly cookie（Next set，server-side fetch 讀） | XSS 安全 |
| Auth providers | Email/Password + Google OAuth | 使用者指定 |
| Testing — unit | vitest + @testing-library/react | 標準組合 |
| Testing — e2e | playwright | 一條 happy path |
| Lint / Format | next lint + prettier + eslint-plugin-tailwindcss | 沿用 + class 自動排序 |
| Package manager | npm | 沿用 |
| Deployment | Zeabur (push to main → auto build) | 使用者指定 |

---

## 4. 目錄結構與 Route Map

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  ← root：html/body/字體/global toaster
│   │   ├── page.tsx                    ← / landing（RSC）
│   │   ├── (auth)/
│   │   │   ├── layout.tsx              ← 置中卡片（max 420px）
│   │   │   ├── login/page.tsx          ← RSC + client form
│   │   │   └── signup/page.tsx
│   │   └── app/
│   │       ├── layout.tsx              ← Sidebar + <PlayerProvider> + <AudioHost> + <MiniPlayer/>
│   │       ├── error.tsx               ← /app/* 共用 error fallback
│   │       ├── dashboard/
│   │       │   ├── page.tsx
│   │       │   ├── loading.tsx
│   │       │   └── error.tsx
│   │       ├── play/page.tsx           ← Composer + 大 PlayerStage
│   │       ├── library/
│   │       │   ├── page.tsx
│   │       │   ├── loading.tsx
│   │       │   └── error.tsx
│   │       ├── sessions/{page,loading,error}.tsx
│   │       └── settings/page.tsx
│   ├── components/
│   │   ├── ui/                         ← shadcn primitives（不修改）
│   │   ├── layout/
│   │   │   ├── app-shell.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── sidebar-nav-item.tsx
│   │   │   ├── user-menu.tsx
│   │   │   └── auth-shell.tsx
│   │   ├── player/
│   │   │   ├── audio-host.tsx          ← 唯一持有 <audio> ref 的 component
│   │   │   ├── mini-player.tsx         ← fixed bottom
│   │   │   ├── player-stage.tsx        ← /app/play 大畫面
│   │   │   ├── player-controls.tsx     ← 共用按鈕組
│   │   │   └── track-card.tsx          ← Library item
│   │   └── features/
│   │       ├── auth/{login-form,signup-form,google-button}.tsx
│   │       ├── composer/{mood-picker,composer-form}.tsx
│   │       ├── library/library-grid.tsx
│   │       ├── sessions/{session-list,session-status-badge}.tsx
│   │       ├── settings/profile-form.tsx
│   │       └── empty-state.tsx
│   ├── lib/
│   │   ├── server/
│   │   │   ├── api.ts                  ← serverFetch + ApiError + UnauthorizedError
│   │   │   ├── auth.ts                 ← getCurrentUser、requireUser
│   │   │   └── actions/
│   │   │       ├── auth.ts             ← loginAction、signupAction、googleAction、logoutAction
│   │   │       ├── profile.ts          ← updateProfileAction
│   │   │       ├── playback.ts         ← startPlaybackAction、nextTrackAction
│   │   │       ├── generation.ts       ← createGenerationJobAction
│   │   │       └── focus-session.ts    ← createFocusSessionAction、completeFocusSessionAction
│   │   ├── stores/
│   │   │   └── player-store.ts         ← zustand
│   │   └── validation/
│   │       └── schemas.ts              ← zod schemas（與 backend Pydantic 對齊）
│   ├── types/
│   │   └── api.ts
│   └── middleware.ts                   ← 路由守門
└── tests/
    ├── e2e/critical-flow.spec.ts
    └── unit/{schemas,player-store,auth-action,generation-action,composer-form}.test.ts
```

**Route map ↔ Backend API**：

| Route | 渲染 | Server-side fetch / action |
|---|---|---|
| `/` | RSC (static) | — |
| `/login` | RSC + client form | `loginAction`、`googleAction` → `POST /api/auth/login`、`POST /api/auth/google` |
| `/signup` | RSC + client form | `signupAction`、`googleAction` → `POST /api/auth/signup`、`POST /api/auth/google` |
| `/app/dashboard` | RSC | `GET /api/auth/me` + `/profile` + `/focus-sessions` + `/library/tracks` |
| `/app/play` | RSC + client | `GET /catalog/moods`；actions → `/play/start`、`/generation/jobs`、`/focus-sessions` |
| `/app/library` | RSC | `GET /api/library/tracks` |
| `/app/sessions` | RSC | `GET /api/focus-sessions` |
| `/app/settings` | RSC + client | `GET /api/profile`；`updateProfileAction` → `PATCH /api/profile` |

---

## 5. Component 切分原則

- `ui/` 是 shadcn 完全不動的原始 primitives；所有客製樣式透過 `globals.css` 改 shadcn 的 CSS variables，不改 ui 檔
- `features/` component **不接受巨大 props 物件** — 只接收剛好夠用的 data（例如 `LibraryGrid({ tracks })`）；state 透過 zustand store 或 Server Action
- 現有 `components/home/*` 整個 dir **刪掉重寫**，不嘗試救（props drilling 太嚴重）
- shadcn 主題：`mint` → `--primary`、`ink` → `--background`、`sky` → `--accent`，保留品牌色同時拿到 shadcn 的元件機制

---

## 6. Data Flow

### Server-side fetch（`lib/server/api.ts`）

```ts
import { cookies } from "next/headers";

const BASE = process.env.API_BASE_URL ?? "http://localhost:8000";
const TOKEN_COOKIE = "musync_token";

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export class UnauthorizedError extends ApiError {
  constructor() { super("Unauthorized", 401); }
}

export async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");

  // 預設 no-store（authenticated content 不該被 cache）；caller 可覆寫
  const res = await fetch(`${BASE}${path}`, { cache: "no-store", ...init, headers });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new ApiError(err?.detail ?? res.statusText, res.status);
  }
  return res.json() as Promise<T>;
}
```

### RSC page 範例

```ts
// app/app/library/page.tsx
export default async function LibraryPage() {
  const tracks = await serverFetch<Track[]>("/api/library/tracks");
  return <LibraryGrid tracks={tracks} />;
}
```

### Server Action 統一回傳格式

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

### Login Action 範例

```ts
"use server";
export async function loginAction(_: unknown, formData: FormData): Promise<ActionResult<null>> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    const data = await serverFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    (await cookies()).set(TOKEN_COOKIE, data.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Login failed" };
  }
  redirect("/app/dashboard");
}
```

### Mutation 後資料更新

- 列表類（library / sessions / jobs）：Server Action 完成後 `revalidatePath("/app/library")`，RSC 自動重抓
- 即時類（剛生成的 track 要立刻播）：Server Action 回傳新 track → client form 拿到後 `playerStore.getState().playTrack(track)`，不等 revalidate

### Form 互動模式（Next 16 / React 19）

```tsx
"use client";
const [state, formAction, pending] = useActionState(loginAction, null);
return <form action={formAction}>...</form>;
```

---

## 7. Auth & Middleware

### `middleware.ts`（project root）

```ts
import { NextResponse, type NextRequest } from "next/server";

const TOKEN_COOKIE = "musync_token";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const { pathname } = request.nextUrl;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isAppPage = pathname.startsWith("/app");

  if (!token && isAppPage) return NextResponse.redirect(`${appUrl}/login`);
  if (token && isAuthPage) return NextResponse.redirect(`${appUrl}/app/dashboard`);

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

> **Token 失效情境**：middleware 只看 cookie 存在；若 backend 把 token 失效（logout / 過期），下一次 RSC fetch 會收到 401，由 `serverFetch` throw `UnauthorizedError` → 上層 `error.tsx` 觸發 `redirect('/login')` + 清 cookie。雙保險。

### Auth helpers（`lib/server/auth.ts`）

```ts
export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  try { return await serverFetch<User>("/api/auth/me"); } catch { return null; }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
```

### Google OAuth 流程

1. Frontend 載 Google Identity Services script，`<GoogleButton>` (client component) 呼叫 GIS 拿 ID token（純瀏覽器，無 redirect）
2. `<GoogleButton>` 直接 `await googleAction(idToken)` —— Server Action 可以被 client 用一般函式呼叫（不需 `<form>`）：
   ```tsx
   "use client";
   export function GoogleButton() {
     const onCredential = async (response: { credential: string }) => {
       const result = await googleAction(response.credential);
       if (!result.ok) toast.error(result.error);
     };
     // ...掛載 GIS 並監聽 onCredential
   }
   ```
3. Server Action 簽名：
   ```ts
   "use server";
   export async function googleAction(idToken: string): Promise<ActionResult<null>> { ... }
   ```
4. Server Action 把 ID token 丟給 backend `POST /api/auth/google`：
   - Backend 用 `google-auth` 驗 token 簽章 + audience（`GOOGLE_CLIENT_ID`）
   - 解出 email，找/建 user（`password` 為 None）
   - 回 `AuthResponse`
5. Server Action 設 cookie，redirect `/app/dashboard`，跟 email 流程合流

### Backend 改動清單

- `backend/requirements.txt`：加 `google-auth>=2.30`
- `backend/app/routers/auth.py`：加 `POST /api/auth/google` endpoint
- `backend/app/services.py`：`create_user(email, full_name, password=None)`
- `backend/app/state.py`：USERS dict 接受 `password: str | None`
- `backend/.env.example`：加 `GOOGLE_CLIENT_ID`

---

## 8. Player Provider

### Store（`lib/stores/player-store.ts`）

```ts
type PlayerState = {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;              // 0–100，從 profile 初始化
  queue: Track[];
  playbackSessionId: string | null;
};

type PlayerActions = {
  playTrack: (track: Track) => void;
  enqueue: (tracks: Track[]) => void;
  next: () => Promise<void>;   // queue 空時打 /api/play/next
  pause: () => void;
  resume: () => void;
  setVolume: (v: number) => void;
  setPlaybackSession: (id: string) => void;
};
```

### `<AudioHost>`（唯一持有 `<audio>` ref）

```tsx
"use client";
export function AudioHost() {
  const { currentTrack, isPlaying, volume, next } = usePlayerStore();
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!ref.current || !currentTrack) return;
    ref.current.src = currentTrack.stream_url;
    ref.current.volume = volume / 100;
    if (isPlaying) ref.current.play();
  }, [currentTrack, isPlaying, volume]);

  return <audio ref={ref} onEnded={next} preload="auto" />;
}
```

### `(app)/layout.tsx`

```tsx
export default async function AppLayout({ children }) {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      {children}
      <AudioHost />
      <MiniPlayer />
    </AppShell>
  );
}
```

`<AudioHost>` 與 `<MiniPlayer>` 在 `(app)` layout 內，跨 `/app/*` 任何子頁不重新 mount，音樂不斷。

---

## 9. Error / Loading / Empty States

| 錯誤來源 | 抓取點 | 呈現 |
|---|---|---|
| `serverFetch` 401 | throw `UnauthorizedError` | `error.tsx` 偵測 → 清 cookie + redirect `/login` |
| `serverFetch` 5xx / network | throw `ApiError` | route `error.tsx`：「載入失敗」+ retry |
| Server Action zod 失敗 | `.safeParse()` 失敗 | 回 `fieldErrors`，shadcn `<FormMessage>` 顯示 |
| Server Action backend 錯 | catch `ApiError` | 回 `error`，client 用 `sonner` toast |
| `<audio>` onError | 進 store | MiniPlayer badge「播放失敗」+ toast |

**Loading**：每個列表 RSC page 配 `loading.tsx` 用 shadcn `<Skeleton>`；form 用 `useActionState` 的 `pending` 顯示 spinner。

**Empty states**：`<EmptyState>`（`components/features/empty-state.tsx`，shadcn 沒附自己刻），由列表 component 內建處理，不在 page 處理。

---

## 10. Testing

### Unit (vitest + @testing-library/react)

| 測試對象 | 為什麼測 |
|---|---|
| `lib/validation/schemas.ts` | 跟 backend Pydantic 對齊，schema 飄了立刻發現 |
| `lib/stores/player-store.ts` | reducer 邏輯（next 從 queue 出 / 空了打 API、enqueue 不 dup） |
| `lib/server/actions/auth.ts` `loginAction` / `googleAction` | mock `serverFetch`，驗 cookie 設定 + redirect |
| `lib/server/actions/generation.ts` | zod 失敗回 fieldErrors、成功回 track |
| `components/features/composer/composer-form.tsx` | render → 填表 → 送出，驗 action 被呼叫 + 錯誤顯示 |

### E2E (playwright) — 一條 happy path

```
1. 訪問 / → 看到 landing
2. 點 "Sign up" → /signup
3. 填 email/password/name → submit
4. 預期 redirect 到 /app/dashboard
5. sidebar 點 "Play" → /app/play
6. 選 mood "focus"、填 prompt、送 "Generate music"
7. 預期 MiniPlayer 出現新 track
8. sidebar 點 "Library" → /app/library
9. 預期看到剛剛生成的 track
10. logout → redirect /
```

> Google OAuth e2e 不寫（需要真的 Google 帳號流程），靠 unit test mock 涵蓋 `googleAction` 邏輯。

### 不測

- shadcn primitives（社群已驗證）
- RSC 純展示（e2e 涵蓋）
- CSS / 視覺（人眼比 snapshot 可靠）

### CI

不設 GitHub Actions。本地 `npm test` + `npm run e2e`。Zeabur push-to-main auto deploy。

---

## 11. Deployment（Zeabur）

- 兩個 service：`frontend/` 和 `backend/`，各自的 Dockerfile（沿用現狀）
- Push to `main` → Zeabur auto build & deploy

### Env vars

**Frontend (Zeabur)**：
- `NEXT_PUBLIC_APP_URL=https://<frontend-domain>`
- `API_BASE_URL=https://<backend-domain>`（server-side，取代舊的 `NEXT_PUBLIC_API_BASE`）
- `GOOGLE_CLIENT_ID=<oauth-client-id>`

**Backend (Zeabur)**：
- `CORS_ORIGINS=https://<frontend-domain>`
- `GOOGLE_CLIENT_ID=<oauth-client-id>`（驗 ID token 用，必須跟 frontend 同一個）

---

## 12. Migration 順序（給 implementation plan 用）

1. 升 Next 16 + React 19 + 對應 type 套件，現有單頁先跑得起來
2. 加 prettier + eslint-plugin-tailwindcss，跑 `npm run lint -- --fix`
3. 安裝 shadcn (`npx shadcn init`) + 加需要的 primitives + 主題映射
4. 抽 `lib/validation/schemas.ts` zod schemas
5. 寫 `lib/server/api.ts`、`lib/server/auth.ts`、所有 Server Actions
6. 寫 `middleware.ts` + cookie 模型
7. 切 `(auth)` route group + login/signup pages（先 email-only）
8. Backend 加 Google endpoint + dependency
9. 加 `<GoogleButton>` + `googleAction`，串通 Google 登入
10. 切 `app/` route group + sidebar layout + AppShell + UserMenu
11. 寫 zustand player store + `<AudioHost>` + `<MiniPlayer>`
12. 切 `dashboard` / `play` / `library` / `sessions` / `settings` 五頁
13. 加 `loading.tsx` / `error.tsx` / `<EmptyState>`
14. 寫 vitest unit tests（schemas、player store、actions、composer-form）
15. 寫 playwright e2e（critical-flow happy path）
16. 刪除 `frontend/src/components/home/` 整個 dir
17. 更新 `frontend/.env.example`、`backend/.env.example`、`README.md`
18. 跑全套 lint + typecheck + unit + e2e 確認綠
19. Commit 各節點 → push `main` → Zeabur auto deploy

---

## 13. Decision log

| # | 決策 | 替代方案 | 理由 |
|---|---|---|---|
| 1 | 多頁路由（B） | 單一 dashboard 內 tab；極簡兩頁 | URL 可分享、回上一頁、獨立載入 |
| 2 | RSC + httpOnly cookie + Server Actions（C） | localStorage + 純 client；TanStack Query | Next 16 強項 + XSS 安全 + 列表頁適合 RSC |
| 3 | Next.js `middleware.ts` 做路由守門 | RSC 內 `requireUser` redirect | middleware 早於 RSC 攔截，省掉一次 fetch |
| 4 | 全域 `<AudioHost>`（A） | 換頁就停；只 /play 有播放器 | Spotify 體感，焦點 session 中切頁不斷 |
| 5 | shadcn/ui + Radix（C） | 保留現有手寫；自抽 primitives | 使用者指定，長期最強 |
| 6 | zustand for player state | Context + useReducer | 跨多 component 讀寫，~1KB，DX 好 |
| 7 | 不加 React Query | 加 RQ | RSC + revalidatePath 已夠用 |
| 8 | Google OAuth 進 MVP | 延後 | 使用者要求 |
| 9 | Backend 改最小（加 Google endpoint + 改 password Optional） | 完全不動 backend | Google 必須驗 token，無法純 frontend |
| 10 | Zeabur push-to-main，不寫 GH Actions | GH Actions CI | 使用者已用 Zeabur auto deploy |
| 11 | 不修密碼 hashing / 持久化 | 一起修 | Scope 太大，另開 spec |
| 12 | 不接真 ACE 1.5 | 一起接 | 仍是 stub 階段，另開 spec |
