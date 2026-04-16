# Next.js 16 Routing Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 MuSync frontend 從單頁 14.2 React 18 重構成 Next 16 多頁 RSC 架構，加 shadcn/ui、httpOnly cookie auth、zustand 全域 player、Google OAuth 與最小測試組合。

**Architecture:** App Router 多頁（`(auth)` route group + `app/` 子路徑）+ Server Components 主導 + Server Actions + middleware.ts 路由守門 + `<AudioHost>` 跨頁 player。Backend 只動 Google OAuth endpoint。

**Tech Stack:** Next.js 16, React 19, TypeScript 5.5, shadcn/ui + Radix, Tailwind 3, react-hook-form, zod, zustand, vitest, @testing-library/react, playwright, sonner, lucide-react. Backend: FastAPI + google-auth.

**Spec:** `docs/superpowers/specs/2026-04-16-nextjs16-routing-refactor-design.md`

---

## File Structure（這個 plan 會建/改的檔案總覽）

### Frontend create

```
frontend/
├── components.json                                 ← shadcn config
├── postcss.config.mjs                              ← 改 .js → .mjs（next 16 友善）
├── next.config.ts                                  ← 改 .js → .ts（如有）
├── playwright.config.ts
├── vitest.config.ts
├── vitest.setup.ts
├── prettier.config.mjs
├── .env.example                                    ← 改寫
├── src/
│   ├── middleware.ts
│   ├── app/
│   │   ├── layout.tsx                              ← 改寫（加 Toaster、字體）
│   │   ├── page.tsx                                ← 改寫（landing）
│   │   ├── globals.css                             ← 改：shadcn CSS variables 映射 mint/sky/ink
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   └── app/
│   │       ├── layout.tsx
│   │       ├── error.tsx
│   │       ├── dashboard/{page,loading,error}.tsx
│   │       ├── play/{page,loading,error}.tsx
│   │       ├── library/{page,loading,error}.tsx
│   │       ├── sessions/{page,loading,error}.tsx
│   │       └── settings/{page,loading,error}.tsx
│   ├── components/
│   │   ├── ui/                                     ← shadcn add 進來：button card input label
│   │   │                                              select textarea form tabs dialog sheet
│   │   │                                              toast skeleton slider separator avatar
│   │   │                                              dropdown-menu sonner badge
│   │   ├── layout/
│   │   │   ├── app-shell.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── sidebar-nav-item.tsx
│   │   │   ├── user-menu.tsx
│   │   │   └── auth-shell.tsx
│   │   ├── player/
│   │   │   ├── audio-host.tsx
│   │   │   ├── mini-player.tsx
│   │   │   ├── player-stage.tsx
│   │   │   ├── player-controls.tsx
│   │   │   └── track-card.tsx
│   │   └── features/
│   │       ├── auth/
│   │       │   ├── login-form.tsx
│   │       │   ├── signup-form.tsx
│   │       │   └── google-button.tsx
│   │       ├── composer/
│   │       │   ├── mood-picker.tsx
│   │       │   └── composer-form.tsx
│   │       ├── library/
│   │       │   └── library-grid.tsx
│   │       ├── sessions/
│   │       │   ├── session-list.tsx
│   │       │   └── session-status-badge.tsx
│   │       ├── settings/
│   │       │   └── profile-form.tsx
│   │       └── empty-state.tsx
│   ├── lib/
│   │   ├── server/
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   └── actions/
│   │   │       ├── auth.ts
│   │   │       ├── profile.ts
│   │   │       ├── playback.ts
│   │   │       ├── generation.ts
│   │   │       └── focus-session.ts
│   │   ├── stores/
│   │   │   └── player-store.ts
│   │   ├── validation/
│   │   │   └── schemas.ts
│   │   └── utils.ts                                ← shadcn cn() helper
│   └── types/
│       └── api.ts                                  ← 改寫
└── tests/
    ├── e2e/
    │   └── critical-flow.spec.ts
    └── unit/
        ├── schemas.test.ts
        ├── player-store.test.ts
        ├── auth-action.test.ts
        ├── generation-action.test.ts
        └── composer-form.test.tsx
```

### Frontend delete

```
frontend/src/components/home/                       ← 整個 dir
frontend/src/lib/api.ts                             ← 由 lib/server/api.ts 取代
frontend/src/types/app.ts                           ← 由 types/api.ts 取代
frontend/postcss.config.js                          ← 改 .mjs
```

### Backend modify

```
backend/requirements.txt                            ← + google-auth
backend/app/routers/auth.py                         ← + POST /api/auth/google
backend/app/services.py                             ← create_user 接受 password=None
backend/app/schemas.py                              ← + GoogleAuthRequest
backend/app/core/config.py                          ← + GOOGLE_CLIENT_ID
backend/.env.example                                ← + GOOGLE_CLIENT_ID
backend/tests/                                      ← 新增 dir + test_google_auth.py
backend/requirements-dev.txt                        ← 新增（pytest）
```

### Root

```
README.md                                           ← 更新 routes / env / 部署說明
```

---

## Task 1: 升級 Next 16 + React 19

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/tsconfig.json`
- Rename: `frontend/next.config.js` → `frontend/next.config.ts`（若不存在則直接 create `.ts`）
- Rename: `frontend/postcss.config.js` → `frontend/postcss.config.mjs`

- [ ] **Step 1: 改 `frontend/package.json` dependencies 段**

```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.10",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "10.4.20",
    "postcss": "8.4.41",
    "tailwindcss": "3.4.10",
    "typescript": "5.5.3"
  }
}
```

- [ ] **Step 2: 改 `frontend/tsconfig.json` 加 `moduleResolution: "bundler"`（Next 16 推薦）**

> **注意**：以下 `jsx` 與 `include` 的值是 Next 16 強制設定，不可自行更改，否則每次 `next build` 都會被 Next 自動改回來。

確認 `compilerOptions` 含：
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "moduleResolution": "bundler",
    "module": "esnext",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "incremental": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "paths": { "@/*": ["./src/*"] },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "src/**/*", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `frontend/next.config.ts`**

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
};

export default config;
```

- [ ] **Step 4: Rename `frontend/postcss.config.js` → `frontend/postcss.config.mjs` 並改 ESM**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: 安裝**

Run: `cd frontend && rm -rf node_modules package-lock.json && npm install`
Expected: 安裝成功，無 peer dep error

- [ ] **Step 6: 確認 dev server 起得來**

Run: `cd frontend && npm run dev`
Expected: 看到 `Ready in ...`、port 3000 起來、瀏覽器開 `localhost:3000` 能看到（即使壞掉的）首頁。Ctrl+C 結束。

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/tsconfig.json frontend/next.config.ts \
        frontend/postcss.config.mjs
git rm frontend/postcss.config.js 2>/dev/null || true
git commit -m "chore: 升級 Next 16 + React 19"
```

---

## Task 2: 加 prettier + eslint-plugin-tailwindcss + 基礎 ESLint 設定

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/prettier.config.mjs`
- Create: `frontend/.prettierignore`
- Modify: `frontend/.eslintrc.json`（若不存在則 create）

- [ ] **Step 1: 加 dev deps 進 `frontend/package.json`**

`devDependencies` 加：
```json
{
  "prettier": "^3.3.3",
  "prettier-plugin-tailwindcss": "^0.6.6",
  "eslint": "^8.57.0",
  "eslint-config-next": "^16.0.0",
  "eslint-plugin-tailwindcss": "^3.17.4",
  "@typescript-eslint/eslint-plugin": "^8.0.0",
  "@typescript-eslint/parser": "^8.0.0"
}
```

- [ ] **Step 2: Create `frontend/prettier.config.mjs`**

```js
export default {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  plugins: ["prettier-plugin-tailwindcss"],
};
```

- [ ] **Step 3: Create `frontend/.prettierignore`**

```
node_modules
.next
dist
public
package-lock.json
*.md
```

- [ ] **Step 4: Create/overwrite `frontend/.eslintrc.json`**

```json
{
  "extends": ["next/core-web-vitals", "next/typescript", "plugin:tailwindcss/recommended"],
  "rules": {
    "tailwindcss/no-custom-classname": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  },
  "settings": {
    "tailwindcss": {
      "callees": ["cn", "clsx"]
    }
  }
}
```

- [ ] **Step 5: 加 npm scripts 到 `frontend/package.json`**

`scripts` 改成：
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 6: 安裝**

Run: `cd frontend && npm install`
Expected: 安裝成功

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/prettier.config.mjs frontend/.prettierignore \
        frontend/.eslintrc.json
git commit -m "chore: 加 prettier + eslint-plugin-tailwindcss"
```

---

## Task 3: 安裝 shadcn/ui 並映射 mint/sky/ink 主題

**Files:**
- Create: `frontend/components.json`
- Create: `frontend/src/lib/utils.ts`
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/package.json`（shadcn 會自動加 dep）

- [ ] **Step 1: 安裝 shadcn 必要 dep**

Run:
```bash
cd frontend && npm install class-variance-authority clsx tailwind-merge lucide-react \
                            tailwindcss-animate @radix-ui/react-slot
```

- [ ] **Step 2: Create `frontend/src/lib/utils.ts`**

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create `frontend/components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

- [ ] **Step 4: Overwrite `frontend/src/app/globals.css`** 把 mint/sky/ink 映射到 shadcn variables

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* MuSync brand → shadcn */
    --background: 222 47% 6%;       /* ink */
    --foreground: 210 20% 98%;
    --card: 222 47% 9%;
    --card-foreground: 210 20% 98%;
    --popover: 222 47% 9%;
    --popover-foreground: 210 20% 98%;
    --primary: 152 76% 63%;         /* mint */
    --primary-foreground: 222 47% 6%;
    --secondary: 217 33% 17%;
    --secondary-foreground: 210 20% 98%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    --accent: 199 89% 64%;          /* sky */
    --accent-foreground: 222 47% 6%;
    --destructive: 0 73% 60%;
    --destructive-foreground: 210 20% 98%;
    --border: 217 33% 20%;
    --input: 217 33% 20%;
    --ring: 152 76% 63%;
    --radius: 1rem;
  }
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground antialiased; }
}
```

- [ ] **Step 5: Overwrite `frontend/tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

- [ ] **Step 6: 加 shadcn primitives**

Run:
```bash
cd frontend && npx shadcn@latest add button card input label select textarea form tabs \
  dialog sheet skeleton slider separator avatar dropdown-menu sonner badge -y
```
Expected: 在 `src/components/ui/` 出現一堆 .tsx 檔；`package.json` 自動加 `@radix-ui/*` 與 `react-hook-form`、`@hookform/resolvers`、`zod`、`sonner` 等

- [ ] **Step 7: 確認 dev server 仍可啟動**

Run: `cd frontend && npm run dev`
Expected: Ready in ...，原 `/` 仍能載入（樣式可能跑掉，沒關係，下任務換 page）。Ctrl+C 結束。

- [ ] **Step 8: Commit**

```bash
git add frontend/components.json frontend/src/lib/utils.ts \
        frontend/src/app/globals.css frontend/tailwind.config.ts \
        frontend/src/components/ui/ frontend/package.json frontend/package-lock.json
git commit -m "feat: 安裝 shadcn/ui 並映射 mint/sky/ink 主題"
```

---

## Task 4: 加 vitest + @testing-library 測試基礎設施

**Files:**
- Create: `frontend/vitest.config.ts`
- Create: `frontend/vitest.setup.ts`
- Modify: `frontend/package.json`

- [ ] **Step 1: 加 dev deps**

Run:
```bash
cd frontend && npm install -D vitest @vitest/ui @testing-library/react \
  @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
```

- [ ] **Step 2: Create `frontend/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Create `frontend/vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: 加 npm scripts 到 `frontend/package.json`**

`scripts` 加：
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui"
}
```

- [ ] **Step 5: 確認 vitest 起得來（無 test 檔也應該 exit 0 或回 "no test files"）**

Run: `cd frontend && npm test`
Expected: 「No test files found」或類似訊息，exit 0 或 1（兩種皆 OK）

- [ ] **Step 6: Commit**

```bash
git add frontend/vitest.config.ts frontend/vitest.setup.ts \
        frontend/package.json frontend/package-lock.json
git commit -m "chore: 加 vitest 測試基礎設施"
```

---

## Task 5: 寫 zod schemas（TDD）

**Files:**
- Create: `frontend/src/lib/validation/schemas.ts`
- Create: `frontend/tests/unit/schemas.test.ts`

- [ ] **Step 1: Write failing test — `frontend/tests/unit/schemas.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  loginSchema,
  signupSchema,
  composerSchema,
  profileUpdateSchema,
} from "@/lib/validation/schemas";

describe("loginSchema", () => {
  it("接受合法 email + 密碼", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "12345678" });
    expect(result.success).toBe(true);
  });

  it("拒絕無效 email", () => {
    const result = loginSchema.safeParse({ email: "not-email", password: "12345678" });
    expect(result.success).toBe(false);
  });

  it("拒絕短密碼", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "short" });
    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("接受合法 signup", () => {
    const r = signupSchema.safeParse({
      email: "a@b.com",
      password: "12345678",
      full_name: "Rudy",
    });
    expect(r.success).toBe(true);
  });

  it("拒絕過短 full_name", () => {
    const r = signupSchema.safeParse({ email: "a@b.com", password: "12345678", full_name: "R" });
    expect(r.success).toBe(false);
  });
});

describe("composerSchema", () => {
  it("接受合法 composer", () => {
    const r = composerSchema.safeParse({
      title: "Deep work",
      mood: "focus",
      duration_minutes: 50,
      prompt: "lofi piano",
    });
    expect(r.success).toBe(true);
  });

  it("拒絕 duration < 5", () => {
    const r = composerSchema.safeParse({
      title: "Deep work",
      mood: "focus",
      duration_minutes: 4,
      prompt: "lofi",
    });
    expect(r.success).toBe(false);
  });

  it("拒絕 duration > 180", () => {
    const r = composerSchema.safeParse({
      title: "Deep work",
      mood: "focus",
      duration_minutes: 181,
      prompt: "lofi",
    });
    expect(r.success).toBe(false);
  });
});

describe("profileUpdateSchema", () => {
  it("接受空物件（全部 optional）", () => {
    const r = profileUpdateSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("拒絕 background_volume > 100", () => {
    const r = profileUpdateSchema.safeParse({ background_volume: 101 });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `cd frontend && npm test -- schemas`
Expected: FAIL — module 不存在

- [ ] **Step 3: Create `frontend/src/lib/validation/schemas.ts`**

```ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  full_name: z.string().min(2).max(80),
});

export const composerSchema = z.object({
  title: z.string().min(2).max(80),
  mood: z.string().min(3).max(30),
  duration_minutes: z.coerce.number().int().min(5).max(180),
  prompt: z.string().min(1).max(180),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().min(2).max(80).optional(),
  preferred_mood: z.string().min(3).max(30).optional(),
  daily_focus_minutes: z.coerce.number().int().min(15).max(480).optional(),
  background_volume: z.coerce.number().int().min(0).max(100).optional(),
  onboarding_complete: z.boolean().optional(),
});

export const generationSchema = z.object({
  mood: z.string().min(3).max(30),
  prompt: z.string().min(1).max(180),
  duration_sec: z.coerce.number().int().min(30).max(900).default(180),
  title: z.string().max(80).optional(),
});

export const focusSessionSchema = z.object({
  title: z.string().min(2).max(80),
  mood: z.string().min(3).max(30),
  duration_minutes: z.coerce.number().int().min(5).max(180),
  prompt: z.string().min(1).max(180),
});

export const playbackStartSchema = z.object({
  mood: z.string().min(3).max(30),
  prompt: z.string().min(1).max(180),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ComposerInput = z.infer<typeof composerSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type GenerationInput = z.infer<typeof generationSchema>;
export type FocusSessionInput = z.infer<typeof focusSessionSchema>;
export type PlaybackStartInput = z.infer<typeof playbackStartSchema>;
```

- [ ] **Step 4: Run test, expect PASS**

Run: `cd frontend && npm test -- schemas`
Expected: PASS — 所有測試綠

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/validation/schemas.ts frontend/tests/unit/schemas.test.ts
git commit -m "feat: 加 zod validation schemas（與 backend Pydantic 對齊）"
```

---

## Task 6: 寫 API types 統一檔

**Files:**
- Create: `frontend/src/types/api.ts`
- Delete (later in Task 30): `frontend/src/types/app.ts`

- [ ] **Step 1: Create `frontend/src/types/api.ts`**

```ts
export type Mood = {
  key: string;
  label: string;
  description: string;
};

export type Track = {
  id: string;
  title: string;
  mood: string;
  prompt: string;
  stream_url: string;
  duration_sec: number;
  source: string;
  created_at: string;
};

export type User = {
  id: string;
  email: string;
  created_at: string;
};

export type Profile = {
  user_id: string;
  full_name: string;
  onboarding_complete: boolean;
  preferred_mood: string;
  daily_focus_minutes: number;
  background_volume: number;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type FocusSessionStatus = "active" | "completed" | "abandoned";

export type FocusSession = {
  id: string;
  user_id: string;
  title: string;
  mood: string;
  duration_minutes: number;
  prompt: string;
  status: FocusSessionStatus;
  started_at: string;
  completed_at: string | null;
};

export type GenerationJob = {
  job_id: string;
  user_id: string;
  mood: string;
  prompt: string;
  prompt_normalized: string;
  model: string;
  status: string;
  duration_sec: number;
  created_at: string;
  completed_at: string | null;
  track: Track | null;
};

export type StartPlaybackResponse = {
  session_id: string;
  track: Track;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat: 加 API types 統一檔"
```

---

## Task 7: 寫 zustand player store（TDD）

**Files:**
- Create: `frontend/src/lib/stores/player-store.ts`
- Create: `frontend/tests/unit/player-store.test.ts`
- Modify: `frontend/package.json`（加 zustand）

- [ ] **Step 1: 安裝 zustand**

Run: `cd frontend && npm install zustand`

- [ ] **Step 2: Write failing test — `frontend/tests/unit/player-store.test.ts`**

```ts
import { beforeEach, describe, it, expect } from "vitest";
import { usePlayerStore } from "@/lib/stores/player-store";
import type { Track } from "@/types/api";

const track1: Track = {
  id: "t1", title: "Track 1", mood: "focus", prompt: "p", stream_url: "u1",
  duration_sec: 180, source: "seed", created_at: "2026-01-01",
};
const track2: Track = { ...track1, id: "t2", title: "Track 2", stream_url: "u2" };

beforeEach(() => {
  usePlayerStore.setState({
    currentTrack: null,
    isPlaying: false,
    volume: 60,
    queue: [],
    playbackSessionId: null,
  });
});

describe("playerStore", () => {
  it("playTrack 設定 currentTrack 並 isPlaying=true", () => {
    usePlayerStore.getState().playTrack(track1);
    const s = usePlayerStore.getState();
    expect(s.currentTrack).toEqual(track1);
    expect(s.isPlaying).toBe(true);
  });

  it("pause 設定 isPlaying=false", () => {
    usePlayerStore.getState().playTrack(track1);
    usePlayerStore.getState().pause();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it("resume 設定 isPlaying=true", () => {
    usePlayerStore.setState({ currentTrack: track1, isPlaying: false });
    usePlayerStore.getState().resume();
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it("enqueue 不重複 id", () => {
    usePlayerStore.getState().enqueue([track1, track2]);
    usePlayerStore.getState().enqueue([track1]);
    expect(usePlayerStore.getState().queue).toHaveLength(2);
  });

  it("setVolume clamps to 0-100", () => {
    usePlayerStore.getState().setVolume(150);
    expect(usePlayerStore.getState().volume).toBe(100);
    usePlayerStore.getState().setVolume(-5);
    expect(usePlayerStore.getState().volume).toBe(0);
  });

  it("next 從 queue 取出第一首並設為 current", async () => {
    usePlayerStore.setState({ queue: [track1, track2] });
    await usePlayerStore.getState().next();
    const s = usePlayerStore.getState();
    expect(s.currentTrack).toEqual(track1);
    expect(s.queue).toEqual([track2]);
  });

  it("queue 空 + 沒 sessionId 時，next 不 throw 也不換 track", async () => {
    usePlayerStore.setState({ currentTrack: track1, queue: [], playbackSessionId: null });
    await expect(usePlayerStore.getState().next()).resolves.toBeUndefined();
    expect(usePlayerStore.getState().currentTrack).toEqual(track1);
  });
});
```

- [ ] **Step 3: Run test, expect FAIL**

Run: `cd frontend && npm test -- player-store`
Expected: FAIL — module 不存在

- [ ] **Step 4: Create `frontend/src/lib/stores/player-store.ts`**

```ts
import { create } from "zustand";
import type { Track } from "@/types/api";

type PlayerState = {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  queue: Track[];
  playbackSessionId: string | null;
};

type PlayerActions = {
  playTrack: (track: Track) => void;
  enqueue: (tracks: Track[]) => void;
  next: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  setVolume: (v: number) => void;
  setPlaybackSession: (id: string) => void;
};

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 60,
  queue: [],
  playbackSessionId: null,

  playTrack: (track) => set({ currentTrack: track, isPlaying: true }),

  enqueue: (tracks) =>
    set((state) => {
      const seen = new Set(state.queue.map((t) => t.id));
      const additions = tracks.filter((t) => !seen.has(t.id));
      return { queue: [...state.queue, ...additions] };
    }),

  next: async () => {
    const { queue, playbackSessionId } = get();
    if (queue.length > 0) {
      const [head, ...rest] = queue;
      set({ currentTrack: head, queue: rest, isPlaying: true });
      return;
    }
    if (!playbackSessionId) return;
    // 由 client 端 fetch 觸發；store 不直接打網路（保持純）
    // 呼叫端負責：const data = await fetch /api/play/next ...，再 playTrack(data.track)
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),

  setVolume: (v) => set({ volume: Math.max(0, Math.min(100, v)) }),

  setPlaybackSession: (id) => set({ playbackSessionId: id }),
}));
```

> 設計選擇：`next()` 不直接打網路。queue 空且有 sessionId 時，由呼叫端（`<MiniPlayer>` / `<AudioHost>`）走 Server Action 拿下一首再 `playTrack(track)`。store 保持純，方便測試。

- [ ] **Step 5: Run test, expect PASS**

Run: `cd frontend && npm test -- player-store`
Expected: PASS — 所有測試綠

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/stores/player-store.ts frontend/tests/unit/player-store.test.ts \
        frontend/package.json frontend/package-lock.json
git commit -m "feat: 加 zustand player store"
```

---

## Task 8: 寫 serverFetch + ApiError

**Files:**
- Create: `frontend/src/lib/server/api.ts`

- [ ] **Step 1: Create `frontend/src/lib/server/api.ts`**

```ts
import { cookies } from "next/headers";

const BASE = process.env.API_BASE_URL ?? "http://localhost:8000";
export const TOKEN_COOKIE = "musync_token";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor() {
    super("Unauthorized", 401);
    this.name = "UnauthorizedError";
  }
}

export async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BASE}${path}`, { cache: "no-store", ...init, headers });

  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new ApiError(data?.detail ?? res.statusText, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: 無錯誤

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/server/api.ts
git commit -m "feat: 加 serverFetch + ApiError + UnauthorizedError"
```

---

## Task 9: 寫 auth helpers（getCurrentUser、requireUser）

**Files:**
- Create: `frontend/src/lib/server/auth.ts`

- [ ] **Step 1: Create `frontend/src/lib/server/auth.ts`**

```ts
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { serverFetch, TOKEN_COOKIE } from "@/lib/server/api";
import type { User } from "@/types/api";

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  try {
    return await serverFetch<User>("/api/auth/me");
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function clearAuthCookie() {
  (await cookies()).delete(TOKEN_COOKIE);
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: 無錯誤

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/server/auth.ts
git commit -m "feat: 加 server-side auth helpers"
```

---

## Task 10: 寫 auth Server Actions（loginAction、signupAction、logoutAction）+ 單元測試

**Files:**
- Create: `frontend/src/lib/server/actions/auth.ts`
- Create: `frontend/tests/unit/auth-action.test.ts`

- [ ] **Step 1: Write failing test — `frontend/tests/unit/auth-action.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// 自動 mock；redirect 必須 throw 才能模擬 Next 真實行為
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
}));

const cookieStore = { set: vi.fn(), get: vi.fn(), delete: vi.fn() };
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock("@/lib/server/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/api")>("@/lib/server/api");
  return {
    ...actual,
    serverFetch: vi.fn(),
  };
});

import { loginAction, signupAction } from "@/lib/server/actions/auth";
import { serverFetch } from "@/lib/server/api";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loginAction", () => {
  it("zod 失敗回 fieldErrors，不打 backend", async () => {
    const formData = new FormData();
    formData.set("email", "not-email");
    formData.set("password", "short");
    const result = await loginAction(null, formData);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.fieldErrors).toBeDefined();
    expect(serverFetch).not.toHaveBeenCalled();
  });

  it("成功時設 cookie 並 redirect /app/dashboard", async () => {
    (serverFetch as any).mockResolvedValueOnce({
      access_token: "tok_x",
      token_type: "bearer",
      user: { id: "u1", email: "a@b.com", created_at: "2026-01-01" },
    });

    const formData = new FormData();
    formData.set("email", "a@b.com");
    formData.set("password", "12345678");

    await expect(loginAction(null, formData)).rejects.toThrow("REDIRECT:/app/dashboard");
    expect(cookieStore.set).toHaveBeenCalledWith(
      "musync_token", "tok_x",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" })
    );
  });

  it("backend 401 回 ok:false + error", async () => {
    (serverFetch as any).mockRejectedValueOnce(new Error("Invalid credentials"));
    const formData = new FormData();
    formData.set("email", "a@b.com");
    formData.set("password", "12345678");
    const result = await loginAction(null, formData);
    expect(result).toMatchObject({ ok: false, error: "Invalid credentials" });
  });
});

describe("signupAction", () => {
  it("成功時設 cookie 並 redirect", async () => {
    (serverFetch as any).mockResolvedValueOnce({
      access_token: "tok_y",
      token_type: "bearer",
      user: { id: "u2", email: "b@c.com", created_at: "2026-01-01" },
    });
    const formData = new FormData();
    formData.set("email", "b@c.com");
    formData.set("password", "12345678");
    formData.set("full_name", "Rudy");
    await expect(signupAction(null, formData)).rejects.toThrow("REDIRECT:/app/dashboard");
    expect(cookieStore.set).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `cd frontend && npm test -- auth-action`
Expected: FAIL — module 不存在

- [ ] **Step 3: Create `frontend/src/lib/server/actions/auth.ts`**

```ts
"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { serverFetch, TOKEN_COOKIE } from "@/lib/server/api";
import { loginSchema, signupSchema } from "@/lib/validation/schemas";
import type { ActionResult, AuthResponse } from "@/types/api";

const COOKIE_OPTIONS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

async function setSessionCookie(token: string) {
  (await cookies()).set(TOKEN_COOKIE, token, COOKIE_OPTIONS);
}

export async function loginAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  let auth: AuthResponse;
  try {
    auth = await serverFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Login failed" };
  }
  await setSessionCookie(auth.access_token);
  redirect("/app/dashboard");
}

export async function signupAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  let auth: AuthResponse;
  try {
    auth = await serverFetch<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Signup failed" };
  }
  await setSessionCookie(auth.access_token);
  redirect("/app/dashboard");
}

export async function googleAction(idToken: string): Promise<ActionResult<null>> {
  if (!idToken) return { ok: false, error: "Missing Google ID token" };
  let auth: AuthResponse;
  try {
    auth = await serverFetch<AuthResponse>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Google sign-in failed" };
  }
  await setSessionCookie(auth.access_token);
  redirect("/app/dashboard");
}

export async function logoutAction(): Promise<ActionResult<null>> {
  try {
    await serverFetch<{ message: string }>("/api/auth/logout", { method: "POST" });
  } catch {
    // 即使 backend 失敗，清掉 cookie
  }
  (await cookies()).delete(TOKEN_COOKIE);
  redirect("/");
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `cd frontend && npm test -- auth-action`
Expected: PASS — 所有測試綠

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/server/actions/auth.ts frontend/tests/unit/auth-action.test.ts
git commit -m "feat: 加 auth Server Actions（含 google + logout）"
```

---

## Task 11: 寫 profile / playback / focus-session Server Actions

**Files:**
- Create: `frontend/src/lib/server/actions/profile.ts`
- Create: `frontend/src/lib/server/actions/playback.ts`
- Create: `frontend/src/lib/server/actions/focus-session.ts`

- [ ] **Step 1: Create `frontend/src/lib/server/actions/profile.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/server/api";
import { profileUpdateSchema } from "@/lib/validation/schemas";
import type { ActionResult, Profile } from "@/types/api";

export async function updateProfileAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<Profile>> {
  const raw = Object.fromEntries(formData);
  if ("onboarding_complete" in raw) {
    raw.onboarding_complete = raw.onboarding_complete === "true" as any;
  }
  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    const profile = await serverFetch<Profile>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    });
    revalidatePath("/app/settings");
    revalidatePath("/app/dashboard");
    return { ok: true, data: profile };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed" };
  }
}
```

- [ ] **Step 2: Create `frontend/src/lib/server/actions/playback.ts`**

```ts
"use server";

import { serverFetch } from "@/lib/server/api";
import { playbackStartSchema } from "@/lib/validation/schemas";
import type { ActionResult, StartPlaybackResponse, Track } from "@/types/api";

export async function startPlaybackAction(
  input: { mood: string; prompt: string },
): Promise<ActionResult<StartPlaybackResponse>> {
  const parsed = playbackStartSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  try {
    const data = await serverFetch<StartPlaybackResponse>("/api/play/start", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Playback failed" };
  }
}

export async function nextTrackAction(
  sessionId: string,
): Promise<ActionResult<{ track: Track }>> {
  if (!sessionId) return { ok: false, error: "Missing session id" };
  try {
    const data = await serverFetch<{ track: Track }>("/api/play/next", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Next failed" };
  }
}
```

- [ ] **Step 3: Create `frontend/src/lib/server/actions/focus-session.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/server/api";
import { focusSessionSchema } from "@/lib/validation/schemas";
import type { ActionResult, FocusSession } from "@/types/api";

export async function createFocusSessionAction(
  input: { title: string; mood: string; duration_minutes: number; prompt: string },
): Promise<ActionResult<FocusSession>> {
  const parsed = focusSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    const session = await serverFetch<FocusSession>("/api/focus-sessions", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    revalidatePath("/app/sessions");
    revalidatePath("/app/dashboard");
    return { ok: true, data: session };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Create failed" };
  }
}

export async function completeFocusSessionAction(
  sessionId: string,
): Promise<ActionResult<FocusSession>> {
  if (!sessionId) return { ok: false, error: "Missing session id" };
  try {
    const session = await serverFetch<FocusSession>(
      `/api/focus-sessions/${sessionId}/complete`,
      { method: "POST" },
    );
    revalidatePath("/app/sessions");
    revalidatePath("/app/dashboard");
    return { ok: true, data: session };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Complete failed" };
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: 無錯誤

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/server/actions/profile.ts \
        frontend/src/lib/server/actions/playback.ts \
        frontend/src/lib/server/actions/focus-session.ts
git commit -m "feat: 加 profile/playback/focus-session Server Actions"
```

---

## Task 12: 寫 generation Server Action（TDD）

**Files:**
- Create: `frontend/src/lib/server/actions/generation.ts`
- Create: `frontend/tests/unit/generation-action.test.ts`

- [ ] **Step 1: Write failing test — `frontend/tests/unit/generation-action.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: () => undefined })) }));
vi.mock("@/lib/server/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/api")>("@/lib/server/api");
  return { ...actual, serverFetch: vi.fn() };
});

import { createGenerationJobAction } from "@/lib/server/actions/generation";
import { serverFetch } from "@/lib/server/api";
import { revalidatePath } from "next/cache";

beforeEach(() => vi.clearAllMocks());

describe("createGenerationJobAction", () => {
  it("zod 失敗回 fieldErrors", async () => {
    const r = await createGenerationJobAction({
      mood: "x", prompt: "", duration_sec: 10,
    });
    expect(r).toMatchObject({ ok: false });
  });

  it("成功時 revalidate /app/library + /app/dashboard 並回 track", async () => {
    const fakeJob = {
      job_id: "j1", user_id: "u1", mood: "focus", prompt: "p",
      prompt_normalized: "n", model: "ace-1.5", status: "completed",
      duration_sec: 180, created_at: "2026-01-01", completed_at: "2026-01-01",
      track: { id: "t1", title: "T", mood: "focus", prompt: "p", stream_url: "u",
               duration_sec: 180, source: "ace-1.5", created_at: "2026-01-01" },
    };
    (serverFetch as any).mockResolvedValueOnce(fakeJob);
    const r = await createGenerationJobAction({
      mood: "focus", prompt: "lofi", duration_sec: 180,
    });
    expect(r).toMatchObject({ ok: true });
    if (r.ok) expect(r.data.track?.id).toBe("t1");
    expect(revalidatePath).toHaveBeenCalledWith("/app/library");
    expect(revalidatePath).toHaveBeenCalledWith("/app/dashboard");
  });

  it("backend 失敗回 error", async () => {
    (serverFetch as any).mockRejectedValueOnce(new Error("Provider down"));
    const r = await createGenerationJobAction({
      mood: "focus", prompt: "lofi", duration_sec: 180,
    });
    expect(r).toMatchObject({ ok: false, error: "Provider down" });
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `cd frontend && npm test -- generation-action`
Expected: FAIL — module 不存在

- [ ] **Step 3: Create `frontend/src/lib/server/actions/generation.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/server/api";
import { generationSchema } from "@/lib/validation/schemas";
import type { ActionResult, GenerationJob } from "@/types/api";

export async function createGenerationJobAction(
  input: { mood: string; prompt: string; duration_sec?: number; title?: string },
): Promise<ActionResult<GenerationJob>> {
  const parsed = generationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    const job = await serverFetch<GenerationJob>("/api/generation/jobs", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    revalidatePath("/app/library");
    revalidatePath("/app/dashboard");
    return { ok: true, data: job };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Generation failed" };
  }
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `cd frontend && npm test -- generation-action`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/server/actions/generation.ts \
        frontend/tests/unit/generation-action.test.ts
git commit -m "feat: 加 generation Server Action"
```

---

## Task 13: 寫 middleware.ts

**Files:**
- Create: `frontend/src/middleware.ts`

- [ ] **Step 1: Create `frontend/src/middleware.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";

const TOKEN_COOKIE = "musync_token";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const { pathname } = request.nextUrl;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isAppPage = pathname.startsWith("/app");

  if (!token && isAppPage) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(`${appUrl}/app/dashboard`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: 無錯誤

- [ ] **Step 3: Commit**

```bash
git add frontend/src/middleware.ts
git commit -m "feat: 加 middleware.ts 路由守門"
```

---

## Task 14: Backend 加 Google OAuth endpoint（TDD with pytest）

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/requirements-dev.txt`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/services.py`
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/routers/auth.py`
- Modify: `backend/.env.example`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_google_auth.py`

- [ ] **Step 1: Modify `backend/requirements.txt`，加 `google-auth>=2.30,<3`**

讀現有 requirements.txt，加一行：
```
google-auth>=2.30,<3
```

- [ ] **Step 2: Create `backend/requirements-dev.txt`**

```
-r requirements.txt
pytest>=8.2
pytest-asyncio>=0.23
httpx>=0.27
```

- [ ] **Step 3: Modify `backend/app/core/config.py`，加 `google_client_id`**

讀現有 `Settings`，在欄位區加：
```python
google_client_id: str | None = None
```

確認 `model_config` 仍從 env 讀取。

- [ ] **Step 4: Modify `backend/app/schemas.py`，加 `GoogleAuthRequest`**

在檔案末加：
```python
class GoogleAuthRequest(BaseModel):
    id_token: str = Field(min_length=10)
```

- [ ] **Step 5: Modify `backend/app/services.py` 的 `create_user`**

把 `password: str` 改成 `password: str | None = None`。`USERS[user_id]` 的 `"password"` 仍存（即使 None）。

差異片段：
```python
def create_user(email: str, full_name: str, password: str | None = None) -> dict:
    if any(user["email"] == email for user in USERS.values()):
        raise HTTPException(status_code=409, detail="Email already registered")

    user_id = f"usr_{uuid4().hex[:10]}"
    created_at = now_iso()
    user = {
        "id": user_id,
        "email": email,
        "password": password,
        "created_at": created_at,
    }
    USERS[user_id] = user
    PROFILES[user_id] = {
        "user_id": user_id,
        "full_name": full_name,
        "onboarding_complete": False,
        "preferred_mood": "focus",
        "daily_focus_minutes": 90,
        "background_volume": 60,
    }
    return user
```

> 注意：原本 signature 是 `create_user(email, password, full_name)`，調整成 keyword 友善的 `create_user(email, full_name, password=None)`。**所有 caller 都要改**（grep `create_user(` 找出來）。

- [ ] **Step 6: Modify `backend/app/routers/auth.py` 加 `POST /api/auth/google`**

先讀現有 auth router，在 router 末尾加：
```python
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from app.schemas import GoogleAuthRequest
from app.core.config import get_settings


@router.post("/google", response_model=AuthResponse)
def google_auth(payload: GoogleAuthRequest):
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google sign-in not configured")
    try:
        info = id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {exc}")

    email = info.get("email")
    if not email or not info.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google email not verified")
    full_name = info.get("name") or email.split("@")[0]

    existing = next((u for u in USERS.values() if u["email"] == email), None)
    if existing:
        user = existing
    else:
        user = create_user(email=email, full_name=full_name, password=None)

    token = create_token(user["id"])
    return AuthResponse(
        access_token=token,
        user=UserOut(id=user["id"], email=user["email"], created_at=user["created_at"]),
    )
```

> 確認 router 上方 import 區已 import `USERS`、`create_token`、`create_user`、`HTTPException`、`UserOut`、`AuthResponse`；缺什麼加什麼。

- [ ] **Step 7: Modify `backend/.env.example`，加 `GOOGLE_CLIENT_ID=`**

- [ ] **Step 8: Create `backend/tests/__init__.py`** （空檔）

- [ ] **Step 9: Create `backend/tests/conftest.py`**

```python
import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id")
    # 重置 in-memory state
    from app.state import USERS, TOKENS, PROFILES, GENERATION_JOBS, TRACK_LIBRARY, FOCUS_SESSIONS, TRACK_POOL, PLAYBACK_SESSIONS
    USERS.clear(); TOKENS.clear(); PROFILES.clear()
    GENERATION_JOBS.clear(); TRACK_LIBRARY.clear(); FOCUS_SESSIONS.clear()
    PLAYBACK_SESSIONS.clear(); TRACK_POOL.clear()

    from app.core.config import get_settings
    get_settings.cache_clear()  # type: ignore[attr-defined]

    from app.main import app
    return TestClient(app)
```

> 若 `get_settings` 不是 `lru_cache`，移除 `cache_clear` 那行。

- [ ] **Step 10: Create `backend/tests/test_google_auth.py`**

```python
from unittest.mock import patch


def test_google_auth_creates_new_user(client):
    with patch("app.routers.auth.id_token.verify_oauth2_token") as verify:
        verify.return_value = {
            "email": "rudy@example.com",
            "email_verified": True,
            "name": "Rudy",
        }
        res = client.post("/api/auth/google", json={"id_token": "fake-id-token"})

    assert res.status_code == 200
    body = res.json()
    assert body["user"]["email"] == "rudy@example.com"
    assert body["access_token"].startswith("msk_")


def test_google_auth_returns_existing_user(client):
    with patch("app.routers.auth.id_token.verify_oauth2_token") as verify:
        verify.return_value = {
            "email": "rudy@example.com",
            "email_verified": True,
            "name": "Rudy",
        }
        first = client.post("/api/auth/google", json={"id_token": "tok1"})
        second = client.post("/api/auth/google", json={"id_token": "tok2"})

    assert first.json()["user"]["id"] == second.json()["user"]["id"]


def test_google_auth_rejects_unverified_email(client):
    with patch("app.routers.auth.id_token.verify_oauth2_token") as verify:
        verify.return_value = {"email": "rudy@example.com", "email_verified": False}
        res = client.post("/api/auth/google", json={"id_token": "tok"})
    assert res.status_code == 401


def test_google_auth_rejects_invalid_token(client):
    with patch("app.routers.auth.id_token.verify_oauth2_token") as verify:
        verify.side_effect = ValueError("bad sig")
        res = client.post("/api/auth/google", json={"id_token": "tok"})
    assert res.status_code == 401
```

- [ ] **Step 11: 安裝 backend dev deps 並跑測試**

Run:
```bash
cd backend && python -m pip install -r requirements-dev.txt && python -m pytest tests/ -v
```
Expected: 4 passed

- [ ] **Step 12: Commit**

```bash
git add backend/requirements.txt backend/requirements-dev.txt backend/.env.example \
        backend/app/schemas.py backend/app/services.py backend/app/core/config.py \
        backend/app/routers/auth.py backend/tests/
git commit -m "feat: backend 加 Google OAuth endpoint + tests"
```

---

## Task 15: Root layout、landing page、globals 更新

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/page.tsx`（landing 改寫）
- Create: `frontend/src/app/error.tsx`
- Create: `frontend/src/app/not-found.tsx`

- [ ] **Step 1: Overwrite `frontend/src/app/layout.tsx`**

```tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "MuSync — Focus music",
  description: "Generate background music tailored to your focus sessions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Overwrite `frontend/src/app/page.tsx`**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="text-lg font-semibold">MuSync</Link>
        <nav className="flex items-center gap-3">
          <Link href="/login"><Button variant="ghost">Sign in</Button></Link>
          <Link href="/signup"><Button>Get started</Button></Link>
        </nav>
      </header>

      <section className="container py-24 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl font-semibold leading-tight md:text-6xl">
          Background music tuned to how you focus.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-muted-foreground">
          Pick a mood, write a prompt, and start a focus session. MuSync streams seed loops
          instantly while it generates a personalized track in the background.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link href="/signup"><Button size="lg">Start a focus session</Button></Link>
          <Link href="/login"><Button size="lg" variant="outline">I have an account</Button></Link>
        </div>
      </section>

      <section className="container grid gap-6 py-16 md:grid-cols-3">
        {[
          { title: "Six moods", body: "Focus, calm, sleep, rainy, happy chill, night drive — each tuned for a different mode." },
          { title: "Prompt-driven", body: "Add your own prompt to steer instrumentation. No vocals, seamless loops." },
          { title: "Personal library", body: "Every generation is saved to your library and re-playable across sessions." },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="container border-t py-8 text-sm text-muted-foreground">
        © MuSync MVP
      </footer>
    </main>
  );
}
```

- [ ] **Step 3: Create `frontend/src/app/error.tsx`**

```tsx
"use client";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
```

- [ ] **Step 4: Create `frontend/src/app/not-found.tsx`**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link href="/"><Button>Back to home</Button></Link>
    </main>
  );
}
```

- [ ] **Step 5: Run dev、確認 / 載入 OK**

Run: `cd frontend && npm run dev`
打開 `localhost:3000` 應該看到新 landing 頁。Ctrl+C。

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/layout.tsx frontend/src/app/page.tsx \
        frontend/src/app/error.tsx frontend/src/app/not-found.tsx
git commit -m "feat: 換 root layout + 重寫 landing page"
```

---

## Task 16: (auth) layout + auth-shell

**Files:**
- Create: `frontend/src/components/layout/auth-shell.tsx`
- Create: `frontend/src/app/(auth)/layout.tsx`

- [ ] **Step 1: Create `frontend/src/components/layout/auth-shell.tsx`**

```tsx
import Link from "next/link";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="mb-8 block text-center text-lg font-semibold">
          MuSync
        </Link>
        <div className="rounded-lg border bg-card p-8 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create `frontend/src/app/(auth)/layout.tsx`**

```tsx
import { AuthShell } from "@/components/layout/auth-shell";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/auth-shell.tsx \
        frontend/src/app/\(auth\)/layout.tsx
git commit -m "feat: 加 (auth) route group layout"
```

---

## Task 17: Login form + login page

**Files:**
- Create: `frontend/src/components/features/auth/login-form.tsx`
- Create: `frontend/src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Create `frontend/src/components/features/auth/login-form.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/lib/server/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  if (state && !state.ok && !state.fieldErrors) {
    toast.error(state.error);
  }

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your MuSync account.</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {fieldErrors?.email ? (
          <p className="text-xs text-destructive">{fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
        {fieldErrors?.password ? (
          <p className="text-xs text-destructive">{fieldErrors.password[0]}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        No account? <Link href="/signup" className="text-primary hover:underline">Sign up</Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 2: Create `frontend/src/app/(auth)/login/page.tsx`**

```tsx
import { LoginForm } from "@/components/features/auth/login-form";
import { GoogleButton } from "@/components/features/auth/google-button";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  return (
    <div className="grid gap-6">
      <GoogleButton label="Continue with Google" />
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>
      <LoginForm />
    </div>
  );
}
```

> `<GoogleButton>` 在 Task 19 才寫；先 import，typecheck 會失敗。**等到 Task 19 完成才 commit 這支頁面**。或先存 stub：
>
> ```tsx
> // 暫時 stub：tasks 19 完成前避免 typecheck 失敗
> export function GoogleButton({ label }: { label: string }) { return <div>{label} (TODO)</div>; }
> ```
>
> 放在 `frontend/src/components/features/auth/google-button.tsx`，Task 19 再覆蓋。

- [ ] **Step 3: Create stub `frontend/src/components/features/auth/google-button.tsx`**

```tsx
"use client";
import { Button } from "@/components/ui/button";

export function GoogleButton({ label }: { label: string }) {
  return <Button variant="outline" type="button" disabled className="w-full">{label}</Button>;
}
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: 無錯誤

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/features/auth/login-form.tsx \
        frontend/src/components/features/auth/google-button.tsx \
        frontend/src/app/\(auth\)/login/page.tsx
git commit -m "feat: 加 login page + form（Google button 暫 stub）"
```

---

## Task 18: Signup form + signup page

**Files:**
- Create: `frontend/src/components/features/auth/signup-form.tsx`
- Create: `frontend/src/app/(auth)/signup/page.tsx`

- [ ] **Step 1: Create `frontend/src/components/features/auth/signup-form.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction } from "@/lib/server/actions/auth";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, null);

  if (state && !state.ok && !state.fieldErrors) {
    toast.error(state.error);
  }

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start your first focus session in under a minute.</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="full_name">Name</Label>
        <Input id="full_name" name="full_name" type="text" autoComplete="name" required />
        {fieldErrors?.full_name ? (
          <p className="text-xs text-destructive">{fieldErrors.full_name[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {fieldErrors?.email ? (
          <p className="text-xs text-destructive">{fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        {fieldErrors?.password ? (
          <p className="text-xs text-destructive">{fieldErrors.password[0]}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have one? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 2: Create `frontend/src/app/(auth)/signup/page.tsx`**

```tsx
import { SignupForm } from "@/components/features/auth/signup-form";
import { GoogleButton } from "@/components/features/auth/google-button";
import { Separator } from "@/components/ui/separator";

export default function SignupPage() {
  return (
    <div className="grid gap-6">
      <GoogleButton label="Sign up with Google" />
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>
      <SignupForm />
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke test**

Run: `cd backend && python -m uvicorn app.main:app --port 8000 &`
Run: `cd frontend && npm run dev`
打開 `localhost:3000/signup`，填表 → 預期 redirect `/app/dashboard`（會 404，因為 Task 22 才寫該頁；但 cookie 應已設定，redirect 應發生）。
Ctrl+C 兩個 process。

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/features/auth/signup-form.tsx \
        frontend/src/app/\(auth\)/signup/page.tsx
git commit -m "feat: 加 signup page + form"
```

---

## Task 19: GoogleButton（GIS 串接 + googleAction）

**Files:**
- Modify: `frontend/src/components/features/auth/google-button.tsx`
- Modify: `frontend/src/app/layout.tsx`（注入 GIS script）

- [ ] **Step 1: Modify `frontend/src/app/layout.tsx`，加 GIS script**

在 `<html>` 內、`<body>` 之前加 `<head>`：

```tsx
return (
  <html lang="en" className={inter.variable}>
    <head>
      <script src="https://accounts.google.com/gsi/client" async defer />
    </head>
    <body className="font-sans antialiased">
      {children}
      <Toaster richColors position="top-right" />
    </body>
  </html>
);
```

- [ ] **Step 2: Overwrite `frontend/src/components/features/auth/google-button.tsx`**

```tsx
"use client";

import { useEffect, useId, useRef } from "react";
import { toast } from "sonner";
import { googleAction } from "@/lib/server/actions/auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (resp: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleButton({ label }: { label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !window.google || !ref.current) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        const result = await googleAction(response.credential);
        if (!result.ok) toast.error(result.error);
      },
    });

    window.google.accounts.id.renderButton(ref.current, {
      type: "standard",
      theme: "outline",
      text: label.toLowerCase().includes("sign up") ? "signup_with" : "signin_with",
      size: "large",
      width: 360,
    });
  }, [clientId, label]);

  if (!clientId) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set.
      </p>
    );
  }

  return <div id={`google-btn-${id}`} ref={ref} className="flex justify-center" />;
}
```

> `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 是新的 frontend env，記得 Task 31 補進 `.env.example`。

- [ ] **Step 3: Manual smoke test (有 Google client id 才測得到)**

設定 `frontend/.env.local`：
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-real-id>
```
backend `.env`：
```
GOOGLE_CLIENT_ID=<same-id>
```

啟兩個 server，測 Google sign-in 流程。
（沒有 client id 也要驗收：button 改顯示提示文字）。

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/layout.tsx \
        frontend/src/components/features/auth/google-button.tsx
git commit -m "feat: GoogleButton 接 GIS + googleAction"
```

---

## Task 20: AppShell（sidebar、UserMenu、(app) layout）

**Files:**
- Create: `frontend/src/components/layout/sidebar-nav-item.tsx`
- Create: `frontend/src/components/layout/sidebar.tsx`
- Create: `frontend/src/components/layout/user-menu.tsx`
- Create: `frontend/src/components/layout/app-shell.tsx`
- Create: `frontend/src/app/app/layout.tsx`
- Create: `frontend/src/app/app/error.tsx`

- [ ] **Step 1: Create `frontend/src/components/layout/sidebar-nav-item.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function SidebarNavItem({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/layout/user-menu.tsx`**

```tsx
"use client";

import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/lib/server/actions/auth";
import type { User } from "@/types/api";

export function UserMenu({ user }: { user: User }) {
  const initial = user.email.slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-md p-2 hover:bg-muted">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col items-start">
            <span className="text-sm font-medium leading-none">{user.email}</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <form action={logoutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Create `frontend/src/components/layout/sidebar.tsx`**

```tsx
import Link from "next/link";
import { LayoutDashboard, Music, Library, Timer, Settings } from "lucide-react";
import { SidebarNavItem } from "./sidebar-nav-item";
import { UserMenu } from "./user-menu";
import type { User } from "@/types/api";

export function Sidebar({ user }: { user: User }) {
  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-card/40">
      <div className="px-4 py-5">
        <Link href="/app/dashboard" className="text-lg font-semibold">MuSync</Link>
      </div>
      <nav className="grid gap-1 px-2">
        <SidebarNavItem href="/app/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <SidebarNavItem href="/app/play" icon={Music} label="Play" />
        <SidebarNavItem href="/app/library" icon={Library} label="Library" />
        <SidebarNavItem href="/app/sessions" icon={Timer} label="Sessions" />
        <SidebarNavItem href="/app/settings" icon={Settings} label="Settings" />
      </nav>
      <div className="mt-auto border-t p-2">
        <UserMenu user={user} />
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Create `frontend/src/components/layout/app-shell.tsx`**

```tsx
import { Sidebar } from "./sidebar";
import type { User } from "@/types/api";

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col">
        <main className="flex-1 overflow-y-auto p-6 pb-28">{children}</main>
      </div>
    </div>
  );
}
```

> `pb-28` 留空間給 fixed bottom MiniPlayer。

- [ ] **Step 5: Create `frontend/src/app/app/layout.tsx`**

```tsx
import { AppShell } from "@/components/layout/app-shell";
import { AudioHost } from "@/components/player/audio-host";
import { MiniPlayer } from "@/components/player/mini-player";
import { requireUser } from "@/lib/server/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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

- [ ] **Step 6: Create `frontend/src/app/app/error.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UnauthorizedError } from "@/lib/server/api";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    if (error.name === "UnauthorizedError") router.replace("/login");
  }, [error, router]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Retry</Button>
    </div>
  );
}
```

> `<AudioHost>` 與 `<MiniPlayer>` 在 Task 21 寫；先 stub 過 typecheck。

- [ ] **Step 7: Stub `<AudioHost>` and `<MiniPlayer>`**

Create `frontend/src/components/player/audio-host.tsx`:
```tsx
"use client";
export function AudioHost() { return <audio aria-hidden="true" />; }
```

Create `frontend/src/components/player/mini-player.tsx`:
```tsx
"use client";
export function MiniPlayer() { return null; }
```

- [ ] **Step 8: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: 無錯誤

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/layout/ frontend/src/components/player/ \
        frontend/src/app/app/layout.tsx frontend/src/app/app/error.tsx
git commit -m "feat: 加 AppShell + sidebar + UserMenu + (app)/layout"
```

---

## Task 21: AudioHost、MiniPlayer、PlayerControls（真實實作）

**Files:**
- Modify: `frontend/src/components/player/audio-host.tsx`
- Modify: `frontend/src/components/player/mini-player.tsx`
- Create: `frontend/src/components/player/player-controls.tsx`

- [ ] **Step 1: Overwrite `frontend/src/components/player/audio-host.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { usePlayerStore } from "@/lib/stores/player-store";
import { nextTrackAction } from "@/lib/server/actions/playback";

export function AudioHost() {
  const ref = useRef<HTMLAudioElement>(null);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const playbackSessionId = usePlayerStore((s) => s.playbackSessionId);
  const queue = usePlayerStore((s) => s.queue);

  useEffect(() => {
    const el = ref.current;
    if (!el || !currentTrack) return;
    if (el.src !== currentTrack.stream_url) el.src = currentTrack.stream_url;
    el.volume = volume / 100;
    if (isPlaying) {
      el.play().catch(() => toast.error("Playback blocked. Click play."));
    } else {
      el.pause();
    }
  }, [currentTrack, isPlaying, volume]);

  async function handleEnded() {
    if (queue.length > 0) {
      await usePlayerStore.getState().next();
      return;
    }
    if (!playbackSessionId) return;
    const result = await nextTrackAction(playbackSessionId);
    if (result.ok) usePlayerStore.getState().playTrack(result.data.track);
    else toast.error(result.error);
  }

  return <audio ref={ref} onEnded={handleEnded} preload="auto" />;
}
```

- [ ] **Step 2: Create `frontend/src/components/player/player-controls.tsx`**

```tsx
"use client";

import { Pause, Play, SkipForward, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { usePlayerStore } from "@/lib/stores/player-store";

export function PlayerControls() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const pause = usePlayerStore((s) => s.pause);
  const resume = usePlayerStore((s) => s.resume);
  const next = usePlayerStore((s) => s.next);
  const setVolume = usePlayerStore((s) => s.setVolume);

  return (
    <div className="flex items-center gap-3">
      <Button size="icon" variant="ghost" onClick={() => (isPlaying ? pause() : resume())}>
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Button size="icon" variant="ghost" onClick={() => next()}>
        <SkipForward className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-muted-foreground" />
        <Slider
          className="w-28"
          value={[volume]}
          min={0}
          max={100}
          step={1}
          onValueChange={(v) => setVolume(v[0])}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Overwrite `frontend/src/components/player/mini-player.tsx`**

```tsx
"use client";

import { Music } from "lucide-react";
import { usePlayerStore } from "@/lib/stores/player-store";
import { PlayerControls } from "./player-controls";

export function MiniPlayer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 backdrop-blur">
      <div className="container flex h-20 items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
          <Music className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium">{currentTrack?.title ?? "Nothing playing"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {currentTrack?.prompt ?? "Generate or pick a track to start."}
          </p>
        </div>
        <PlayerControls />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npm run typecheck`
Expected: 無錯誤

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/player/audio-host.tsx \
        frontend/src/components/player/mini-player.tsx \
        frontend/src/components/player/player-controls.tsx
git commit -m "feat: AudioHost + MiniPlayer + PlayerControls 真實實作"
```

---

## Task 22: Dashboard page

**Files:**
- Create: `frontend/src/app/app/dashboard/page.tsx`
- Create: `frontend/src/app/app/dashboard/loading.tsx`
- Create: `frontend/src/app/app/dashboard/error.tsx`
- Create: `frontend/src/components/features/empty-state.tsx`

- [ ] **Step 1: Create `frontend/src/components/features/empty-state.tsx`**

```tsx
import type { ReactNode } from "react";

export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode; title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <h3 className="text-base font-medium">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/app/app/dashboard/page.tsx`**

```tsx
import Link from "next/link";
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/features/empty-state";
import { serverFetch } from "@/lib/server/api";
import { requireUser } from "@/lib/server/auth";
import type { FocusSession, Profile, Track } from "@/types/api";

export default async function DashboardPage() {
  const user = await requireUser();
  const [profile, sessions, tracks] = await Promise.all([
    serverFetch<Profile>("/api/profile"),
    serverFetch<FocusSession[]>("/api/focus-sessions"),
    serverFetch<Track[]>("/api/library/tracks"),
  ]);

  const active = sessions.find((s) => s.status === "active");
  const todayMin = sessions
    .filter((s) => s.status === "completed" && s.completed_at?.startsWith(new Date().toISOString().slice(0, 10)))
    .reduce((acc, s) => acc + s.duration_minutes, 0);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {profile.full_name}</h1>
        <p className="text-sm text-muted-foreground">Today: {todayMin} / {profile.daily_focus_minutes} focus minutes</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Active session</h2>
          {active ? (
            <p className="mt-2 font-medium">{active.title} · {active.duration_minutes} min</p>
          ) : (
            <p className="mt-2 text-muted-foreground text-sm">No active session</p>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Library size</h2>
          <p className="mt-2 text-2xl font-semibold">{tracks.length}</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Total sessions</h2>
          <p className="mt-2 text-2xl font-semibold">{sessions.length}</p>
        </Card>
      </div>

      {tracks.length === 0 ? (
        <EmptyState
          icon={<Music className="h-6 w-6" />}
          title="No tracks yet"
          description="Generate your first track from the Play page."
          action={<Link href="/app/play"><Button>Open Composer</Button></Link>}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/app/app/dashboard/loading.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/app/app/dashboard/error.tsx`**

```tsx
"use client";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h2 className="text-lg font-semibold">Failed to load dashboard</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Retry</Button>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/app/dashboard/ frontend/src/components/features/empty-state.tsx
git commit -m "feat: 加 dashboard page + loading/error + EmptyState"
```

---

## Task 23: Library page + LibraryGrid

**Files:**
- Create: `frontend/src/components/features/library/library-grid.tsx`
- Create: `frontend/src/components/player/track-card.tsx`
- Create: `frontend/src/app/app/library/page.tsx`
- Create: `frontend/src/app/app/library/loading.tsx`
- Create: `frontend/src/app/app/library/error.tsx`

- [ ] **Step 1: Create `frontend/src/components/player/track-card.tsx`**

```tsx
"use client";

import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlayerStore } from "@/lib/stores/player-store";
import type { Track } from "@/types/api";

export function TrackCard({ track }: { track: Track }) {
  const playTrack = usePlayerStore((s) => s.playTrack);
  return (
    <Card className="flex items-center gap-4 p-4">
      <Button size="icon" onClick={() => playTrack(track)}>
        <Play className="h-4 w-4" />
      </Button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{track.title}</p>
        <p className="truncate text-xs text-muted-foreground">{track.prompt}</p>
      </div>
      <Badge variant="outline">{track.mood}</Badge>
      <span className="text-xs text-muted-foreground">{track.duration_sec}s</span>
    </Card>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/features/library/library-grid.tsx`**

```tsx
import Link from "next/link";
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/features/empty-state";
import { TrackCard } from "@/components/player/track-card";
import type { Track } from "@/types/api";

export function LibraryGrid({ tracks }: { tracks: Track[] }) {
  if (tracks.length === 0) {
    return (
      <EmptyState
        icon={<Music className="h-6 w-6" />}
        title="No tracks yet"
        description="Generate your first track from the Play page."
        action={<Link href="/app/play"><Button>Open Composer</Button></Link>}
      />
    );
  }
  return (
    <div className="grid gap-3">
      {tracks.map((t) => <TrackCard key={t.id} track={t} />)}
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/app/app/library/page.tsx`**

```tsx
import { LibraryGrid } from "@/components/features/library/library-grid";
import { serverFetch } from "@/lib/server/api";
import type { Track } from "@/types/api";

export default async function LibraryPage() {
  const tracks = await serverFetch<Track[]>("/api/library/tracks");
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Library</h1>
        <p className="text-sm text-muted-foreground">{tracks.length} generated tracks</p>
      </div>
      <LibraryGrid tracks={tracks} />
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/app/app/library/loading.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-3">
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/src/app/app/library/error.tsx`** （複製 dashboard 同名檔案，內容相同 — 這是刻意的，避免「Similar to ...」placeholder）

```tsx
"use client";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h2 className="text-lg font-semibold">Failed to load library</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Retry</Button>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/player/track-card.tsx \
        frontend/src/components/features/library/ \
        frontend/src/app/app/library/
git commit -m "feat: 加 library page + LibraryGrid + TrackCard"
```

---

## Task 24: Sessions page + SessionList + status badge

**Files:**
- Create: `frontend/src/components/features/sessions/session-status-badge.tsx`
- Create: `frontend/src/components/features/sessions/session-list.tsx`
- Create: `frontend/src/app/app/sessions/page.tsx`
- Create: `frontend/src/app/app/sessions/loading.tsx`
- Create: `frontend/src/app/app/sessions/error.tsx`

- [ ] **Step 1: Create `frontend/src/components/features/sessions/session-status-badge.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import type { FocusSessionStatus } from "@/types/api";

const variants: Record<FocusSessionStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  completed: "secondary",
  abandoned: "outline",
};

export function SessionStatusBadge({ status }: { status: FocusSessionStatus }) {
  return <Badge variant={variants[status] ?? "outline"}>{status}</Badge>;
}
```

- [ ] **Step 2: Create `frontend/src/components/features/sessions/session-list.tsx`**

```tsx
"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/features/empty-state";
import { SessionStatusBadge } from "./session-status-badge";
import { completeFocusSessionAction } from "@/lib/server/actions/focus-session";
import type { FocusSession } from "@/types/api";

export function SessionList({ sessions }: { sessions: FocusSession[] }) {
  const [pending, startTransition] = useTransition();

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No focus sessions yet"
        description="Start your first focus session from the Play page."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {sessions.map((s) => (
        <Card key={s.id} className="flex items-center gap-4 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{s.title}</p>
            <p className="text-xs text-muted-foreground">
              {s.mood} · {s.duration_minutes} min · started {new Date(s.started_at).toLocaleString()}
            </p>
          </div>
          <SessionStatusBadge status={s.status} />
          {s.status === "active" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await completeFocusSessionAction(s.id);
                  if (!r.ok) toast.error(r.error);
                  else toast.success(`Completed "${r.data.title}"`);
                })
              }
            >
              Complete
            </Button>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/app/app/sessions/page.tsx`**

```tsx
import { SessionList } from "@/components/features/sessions/session-list";
import { serverFetch } from "@/lib/server/api";
import type { FocusSession } from "@/types/api";

export default async function SessionsPage() {
  const sessions = await serverFetch<FocusSession[]>("/api/focus-sessions");
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Focus Sessions</h1>
        <p className="text-sm text-muted-foreground">{sessions.length} total</p>
      </div>
      <SessionList sessions={sessions} />
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/app/app/sessions/loading.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-3">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/src/app/app/sessions/error.tsx`**

```tsx
"use client";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h2 className="text-lg font-semibold">Failed to load sessions</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Retry</Button>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/features/sessions/ frontend/src/app/app/sessions/
git commit -m "feat: 加 sessions page + SessionList + status badge"
```

---

## Task 25: Play page（MoodPicker + ComposerForm + PlayerStage）

**Files:**
- Create: `frontend/src/components/features/composer/mood-picker.tsx`
- Create: `frontend/src/components/features/composer/composer-form.tsx`
- Create: `frontend/src/components/player/player-stage.tsx`
- Create: `frontend/src/app/app/play/page.tsx`
- Create: `frontend/src/app/app/play/loading.tsx`
- Create: `frontend/src/app/app/play/error.tsx`
- Create: `frontend/tests/unit/composer-form.test.tsx`

- [ ] **Step 1: Create `frontend/src/components/features/composer/mood-picker.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";
import type { Mood } from "@/types/api";

export function MoodPicker({
  moods, value, onChange,
}: { moods: Mood[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {moods.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => onChange(m.key)}
          className={cn(
            "rounded-md border px-4 py-3 text-left transition-colors",
            value === m.key ? "border-primary bg-primary/10" : "hover:border-foreground/30",
          )}
        >
          <p className="font-medium">{m.label}</p>
          <p className="text-xs text-muted-foreground">{m.description}</p>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write failing test — `frontend/tests/unit/composer-form.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/server/actions/generation", () => ({
  createGenerationJobAction: vi.fn(async () => ({
    ok: true,
    data: { track: { id: "t1", title: "Generated", mood: "focus", prompt: "p", stream_url: "u",
                     duration_sec: 180, source: "ace-1.5", created_at: "2026-01-01" } },
  })),
}));
vi.mock("@/lib/server/actions/focus-session", () => ({
  createFocusSessionAction: vi.fn(async () => ({ ok: true, data: { id: "s1" } })),
}));
vi.mock("@/lib/server/actions/playback", () => ({
  startPlaybackAction: vi.fn(async () => ({ ok: true, data: { session_id: "ps1", track: {} } })),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/stores/player-store", () => ({
  usePlayerStore: { getState: () => ({ playTrack: vi.fn(), setPlaybackSession: vi.fn() }) },
}));

import { ComposerForm } from "@/components/features/composer/composer-form";
import { createGenerationJobAction } from "@/lib/server/actions/generation";

const moods = [{ key: "focus", label: "Focus", description: "x" }];

beforeEach(() => vi.clearAllMocks());

describe("ComposerForm", () => {
  it("送出 generate 時呼叫 createGenerationJobAction", async () => {
    const user = userEvent.setup();
    render(<ComposerForm moods={moods} defaultMood="focus" />);
    await user.type(screen.getByLabelText(/prompt/i), "lofi piano");
    await user.click(screen.getByRole("button", { name: /generate/i }));
    expect(createGenerationJobAction).toHaveBeenCalledWith(
      expect.objectContaining({ mood: "focus", prompt: expect.stringContaining("lofi") }),
    );
  });
});
```

- [ ] **Step 3: Run test, expect FAIL (component missing)**

Run: `cd frontend && npm test -- composer-form`
Expected: FAIL — module not found

- [ ] **Step 4: Create `frontend/src/components/features/composer/composer-form.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoodPicker } from "./mood-picker";
import { createGenerationJobAction } from "@/lib/server/actions/generation";
import { createFocusSessionAction } from "@/lib/server/actions/focus-session";
import { startPlaybackAction } from "@/lib/server/actions/playback";
import { usePlayerStore } from "@/lib/stores/player-store";
import type { Mood } from "@/types/api";

export function ComposerForm({ moods, defaultMood }: { moods: Mood[]; defaultMood: string }) {
  const [mood, setMood] = useState(defaultMood);
  const [title, setTitle] = useState("Deep work block");
  const [minutes, setMinutes] = useState(50);
  const [prompt, setPrompt] = useState("warm vinyl, soft piano, no vocal");
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const r = await createGenerationJobAction({
        mood, prompt, duration_sec: Math.max(minutes * 60, 180), title,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.data.track) {
        usePlayerStore.getState().playTrack(r.data.track);
        toast.success(`Generated ${r.data.track.title}`);
      }
    });
  }

  function handleStartSession() {
    startTransition(async () => {
      const r = await createFocusSessionAction({
        title, mood, duration_minutes: minutes, prompt,
      });
      if (!r.ok) toast.error(r.error);
      else toast.success(`Focus session "${r.data.title}" started`);
    });
  }

  function handleStartPlayback() {
    startTransition(async () => {
      const r = await startPlaybackAction({ mood, prompt });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      usePlayerStore.getState().setPlaybackSession(r.data.session_id);
      usePlayerStore.getState().playTrack(r.data.track);
    });
  }

  return (
    <div className="grid gap-6">
      <MoodPicker moods={moods} value={mood} onChange={setMood} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="title">Session title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="minutes">Minutes</Label>
          <Input id="minutes" type="number" min={5} max={180} value={minutes}
                 onChange={(e) => setMinutes(Number(e.target.value))} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="prompt">Prompt</Label>
        <Textarea id="prompt" value={prompt} maxLength={180}
                  onChange={(e) => setPrompt(e.target.value)} className="min-h-28" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleGenerate} disabled={pending}>Generate music</Button>
        <Button variant="outline" onClick={handleStartSession} disabled={pending}>Start focus session</Button>
        <Button variant="outline" onClick={handleStartPlayback} disabled={pending}>Start playback</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run composer-form test, expect PASS**

Run: `cd frontend && npm test -- composer-form`
Expected: PASS

- [ ] **Step 6: Create `frontend/src/components/player/player-stage.tsx`**

```tsx
"use client";

import { Music } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlayerStore } from "@/lib/stores/player-store";

export function PlayerStage() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-md bg-muted">
          <Music className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-lg font-semibold">{currentTrack?.title ?? "Nothing playing"}</p>
          <p className="text-sm text-muted-foreground">
            {currentTrack?.prompt ?? "Generate or pick a track."}
          </p>
        </div>
        {currentTrack ? <Badge variant="outline">{currentTrack.source}</Badge> : null}
      </div>
    </Card>
  );
}
```

- [ ] **Step 7: Create `frontend/src/app/app/play/page.tsx`**

```tsx
import { ComposerForm } from "@/components/features/composer/composer-form";
import { PlayerStage } from "@/components/player/player-stage";
import { serverFetch } from "@/lib/server/api";
import { requireUser } from "@/lib/server/auth";
import type { Mood, Profile } from "@/types/api";

export default async function PlayPage() {
  await requireUser();
  const [moods, profile] = await Promise.all([
    serverFetch<Mood[]>("/api/catalog/moods"),
    serverFetch<Profile>("/api/profile"),
  ]);
  return (
    <div className="grid gap-6">
      <PlayerStage />
      <div>
        <h1 className="text-2xl font-semibold">Composer</h1>
        <p className="text-sm text-muted-foreground">Pick a mood, write a prompt, generate.</p>
      </div>
      <ComposerForm moods={moods} defaultMood={profile.preferred_mood} />
    </div>
  );
}
```

- [ ] **Step 8: Create `frontend/src/app/app/play/loading.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-32" />
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64" />
    </div>
  );
}
```

- [ ] **Step 9: Create `frontend/src/app/app/play/error.tsx`**

```tsx
"use client";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h2 className="text-lg font-semibold">Failed to load Play page</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Retry</Button>
    </div>
  );
}
```

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/features/composer/ \
        frontend/src/components/player/player-stage.tsx \
        frontend/src/app/app/play/ \
        frontend/tests/unit/composer-form.test.tsx
git commit -m "feat: 加 play page + composer form + mood picker + tests"
```

---

## Task 26: Settings page + ProfileForm

**Files:**
- Create: `frontend/src/components/features/settings/profile-form.tsx`
- Create: `frontend/src/app/app/settings/page.tsx`
- Create: `frontend/src/app/app/settings/loading.tsx`
- Create: `frontend/src/app/app/settings/error.tsx`

- [ ] **Step 1: Create `frontend/src/components/features/settings/profile-form.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProfileAction } from "@/lib/server/actions/profile";
import type { Mood, Profile } from "@/types/api";

export function ProfileForm({ profile, moods }: { profile: Profile; moods: Mood[] }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, null);

  if (state?.ok) toast.success("Profile saved");
  else if (state && !state.ok && !state.fieldErrors) toast.error(state.error);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid max-w-lg gap-5">
      <div className="grid gap-2">
        <Label htmlFor="full_name">Name</Label>
        <Input id="full_name" name="full_name" defaultValue={profile.full_name} />
        {fieldErrors?.full_name ? <p className="text-xs text-destructive">{fieldErrors.full_name[0]}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="preferred_mood">Preferred mood</Label>
        <Select name="preferred_mood" defaultValue={profile.preferred_mood}>
          <SelectTrigger id="preferred_mood"><SelectValue /></SelectTrigger>
          <SelectContent>
            {moods.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="daily_focus_minutes">Daily focus minutes</Label>
        <Input id="daily_focus_minutes" name="daily_focus_minutes" type="number"
               min={15} max={480} defaultValue={profile.daily_focus_minutes} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="background_volume">Background volume</Label>
        <Input id="background_volume" name="background_volume" type="number"
               min={0} max={100} defaultValue={profile.background_volume} />
      </div>

      <input type="hidden" name="onboarding_complete" value="true" />

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save preferences"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create `frontend/src/app/app/settings/page.tsx`**

```tsx
import { ProfileForm } from "@/components/features/settings/profile-form";
import { serverFetch } from "@/lib/server/api";
import type { Mood, Profile } from "@/types/api";

export default async function SettingsPage() {
  const [profile, moods] = await Promise.all([
    serverFetch<Profile>("/api/profile"),
    serverFetch<Mood[]>("/api/catalog/moods"),
  ]);
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Update your profile and focus preferences.</p>
      </div>
      <ProfileForm profile={profile} moods={moods} />
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/app/app/settings/loading.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 max-w-lg" />
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/app/app/settings/error.tsx`**

```tsx
"use client";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h2 className="text-lg font-semibold">Failed to load settings</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Retry</Button>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/features/settings/ frontend/src/app/app/settings/
git commit -m "feat: 加 settings page + profile form"
```

---

## Task 27: Playwright e2e — critical happy path

**Files:**
- Create: `frontend/playwright.config.ts`
- Create: `frontend/tests/e2e/critical-flow.spec.ts`
- Modify: `frontend/package.json`

- [ ] **Step 1: 安裝 playwright**

Run:
```bash
cd frontend && npm install -D @playwright/test && npx playwright install chromium
```

- [ ] **Step 2: Create `frontend/playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "cd ../backend && python -m uvicorn app.main:app --port 8000",
      port: 8000,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "npm run dev",
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        API_BASE_URL: "http://localhost:8000",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      },
    },
  ],
});
```

- [ ] **Step 3: Create `frontend/tests/e2e/critical-flow.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("signup → play → generate → library → logout", async ({ page }) => {
  // 每次跑用獨立 email，因為 backend 是 in-memory（webServer 重啟才會清）
  const email = `e2e-${Date.now()}@example.com`;

  // 1. landing
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Background music/i })).toBeVisible();

  // 2. → signup
  await page.getByRole("link", { name: /Get started/i }).click();
  await expect(page).toHaveURL(/\/signup$/);

  // 3. fill form & submit
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: /Create account/i }).click();

  // 4. expect redirect to /app/dashboard
  await expect(page).toHaveURL(/\/app\/dashboard$/);
  await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();

  // 5. sidebar → Play
  await page.getByRole("link", { name: "Play" }).click();
  await expect(page).toHaveURL(/\/app\/play$/);

  // 6. fill prompt + Generate
  await page.getByLabel("Prompt").fill("e2e lofi seamless");
  await page.getByRole("button", { name: /Generate music/i }).click();

  // 7. MiniPlayer should show a track（等 sonner toast 也行）
  await expect(page.locator("text=Nothing playing")).toHaveCount(0, { timeout: 10_000 });

  // 8. → Library
  await page.getByRole("link", { name: "Library" }).click();
  await expect(page).toHaveURL(/\/app\/library$/);
  // 至少一個 TrackCard
  await expect(page.locator("[class*='Card'], [class*='card']").first()).toBeVisible();

  // 9. logout
  await page.locator("button", { hasText: email }).click();
  await page.getByRole("button", { name: /Sign out/i }).click();
  await expect(page).toHaveURL(/^http:\/\/localhost:3000\/$/);
});
```

- [ ] **Step 4: 加 npm scripts 到 `frontend/package.json`**

`scripts` 加：
```json
{
  "e2e": "playwright test",
  "e2e:ui": "playwright test --ui"
}
```

- [ ] **Step 5: 跑 e2e**

Run: `cd frontend && npm run e2e`
Expected: 1 passed（playwright 自動起 backend + frontend）

> 如果 e2e 卡在某 selector，照 console 錯誤調整 selector，不要繞過 happy path 的核心斷言。

- [ ] **Step 6: Commit**

```bash
git add frontend/playwright.config.ts frontend/tests/e2e/ \
        frontend/package.json frontend/package-lock.json
git commit -m "test: 加 playwright critical happy path e2e"
```

---

## Task 28: 刪掉舊 home/ 與舊 lib/api.ts、types/app.ts

**Files:**
- Delete: `frontend/src/components/home/` (整個 dir)
- Delete: `frontend/src/lib/api.ts`
- Delete: `frontend/src/types/app.ts`

- [ ] **Step 1: 確認舊檔已無 import**

Run:
```bash
cd frontend && npx grep -r "components/home\|lib/api\|types/app" src/ tests/ || true
```
Expected: 沒有結果（或結果只有檔案本身）

- [ ] **Step 2: 刪除**

Run:
```bash
git rm -r frontend/src/components/home/
git rm frontend/src/lib/api.ts
git rm frontend/src/types/app.ts
```

- [ ] **Step 3: Typecheck + lint**

Run: `cd frontend && npm run typecheck && npm run lint`
Expected: 兩者皆綠

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor: 刪除舊 home/ 與 legacy api/types 檔"
```

---

## Task 29: 更新 .env.example、README

**Files:**
- Modify: `frontend/.env.example`
- Modify: `backend/.env.example`（已在 Task 14 改過 GOOGLE_CLIENT_ID，這裡確認）
- Modify: `README.md`

- [ ] **Step 1: Overwrite `frontend/.env.example`**

```
# Public URL for the deployed frontend (Zeabur 部署時務必設成 public 網址，不是內部 port)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Backend API base URL (server-side only)
API_BASE_URL=http://localhost:8000

# Google OAuth client ID (frontend 與 backend 必須相同)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

- [ ] **Step 2: 確認 `backend/.env.example` 含**

```
CORS_ORIGINS=http://localhost:3000
GOOGLE_CLIENT_ID=
```

如缺則補上。

- [ ] **Step 3: Overwrite `README.md`** 大幅更新

```markdown
# MuSync MVP

Focus music web app: account login (email + Google), focus sessions, prompt-based background track generation.

## Stack
- Frontend: Next.js 16 (App Router, RSC + Server Actions) + shadcn/ui + Tailwind + zustand
- Backend: FastAPI + google-auth (in-memory state for MVP)
- Containerization: Docker (separate Dockerfile per service)

## Routes
| URL | 描述 |
|---|---|
| `/` | Landing |
| `/login`, `/signup` | Auth (email + Google OAuth) |
| `/app/dashboard` | 今日專注時數、active session、library 概覽 |
| `/app/play` | Composer + 大畫面 player |
| `/app/library` | 已生成的 tracks |
| `/app/sessions` | Focus session 歷史 |
| `/app/settings` | Profile / 偏好 |

Auth 使用 httpOnly cookie；middleware 守 `/app/*`，未登入 → `/login`、已登入打 auth 頁 → `/app/dashboard`。

## Local run

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env  # 填 GOOGLE_CLIENT_ID
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local  # 填 NEXT_PUBLIC_GOOGLE_CLIENT_ID
npm run dev
```

## Tests
```bash
# Backend
cd backend && python -m pytest tests/ -v

# Frontend unit
cd frontend && npm test

# Frontend e2e (auto starts backend + frontend)
cd frontend && npm run e2e
```

## Deployment (Zeabur)
- 兩個 service：`frontend/` 和 `backend/`，各自的 Dockerfile
- Push to `main` → Zeabur auto build & deploy
- Frontend env：`NEXT_PUBLIC_APP_URL`、`API_BASE_URL`、`NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- Backend env：`CORS_ORIGINS`、`GOOGLE_CLIENT_ID`

## Google OAuth setup
1. Google Cloud Console → 建 OAuth 2.0 Client ID（type: Web）
2. Authorized JavaScript origins: `https://<frontend-domain>` + `http://localhost:3000`
3. 不需要 Authorized redirect URIs（GIS popup 流程不用）
4. 同一個 Client ID 同時填到 frontend `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 和 backend `GOOGLE_CLIENT_ID`
```

- [ ] **Step 4: Commit**

```bash
git add frontend/.env.example backend/.env.example README.md
git commit -m "docs: 更新 README 與 env 範例為新架構"
```

---

## Task 30: 全套品質閘門 + push main

**Files:**（無新建）

- [ ] **Step 1: Frontend typecheck + lint + format**

Run:
```bash
cd frontend && npm run typecheck && npm run lint && npm run format:check
```
Expected: 全綠（format:check 若失敗，跑 `npm run format` 然後重跑）

- [ ] **Step 2: Frontend unit tests**

Run: `cd frontend && npm test`
Expected: 全 pass

- [ ] **Step 3: Frontend e2e**

Run: `cd frontend && npm run e2e`
Expected: 1 passed

- [ ] **Step 4: Backend tests**

Run: `cd backend && python -m pytest tests/ -v`
Expected: 4 passed

- [ ] **Step 5: 確認 git 乾淨**

Run: `git status`
Expected: working tree clean，所有變更皆已 commit

- [ ] **Step 6: Push to main**

Run: `git push origin main`
Expected: 推送成功；Zeabur 會自動 build & deploy

- [ ] **Step 7: Verify Zeabur deployment**

打開 Zeabur dashboard，確認 frontend 和 backend service 都 build 成功；訪問 public URL 跑一次 e2e happy path。

---

## Self-Review

### Spec coverage check

- ✅ §1 動機 → 整個 plan 動機
- ✅ §2 Scope in/out/future → Task 14 backend 改動範圍對齊；future（Stripe）未做
- ✅ §3 Tech stack → Task 1（Next 16）、Task 3（shadcn）、Task 4（vitest）、Task 7（zustand）、Task 27（playwright）
- ✅ §4 目錄與 route map → Task 15-26 對應每個 route + 元件
- ✅ §5 Component 切分原則 → Task 17-26 每個 feature 都有獨立檔
- ✅ §6 Data flow（serverFetch、Server Actions、useActionState）→ Task 8、10-12、17-18、26
- ✅ §7 Auth & Middleware → Task 9、10、13、14、19
- ✅ §8 Player provider → Task 7（store）、Task 21（AudioHost、MiniPlayer）
- ✅ §9 Error/Loading/Empty → Task 15（root error/404）、Task 20（app error）、Task 22-26（每頁 loading/error）、Task 22（EmptyState）
- ✅ §10 Testing → Task 5、7、10、12、25、27（schemas、store、auth-action、generation-action、composer-form、e2e）
- ✅ §11 Deployment → Task 29 README + .env.example
- ✅ §12 Migration order → Task 1-30 對應 spec §12 的 19 步
- ✅ §13 Decision log → 整個 plan 是 decision log 的具體執行

### Placeholder scan

- ✅ 沒有 "TBD"、"TODO"、"implement later"
- ✅ 沒有「add appropriate error handling」這類 vague 指令；每個錯誤處理都明寫
- ✅ 沒有「Similar to Task N」；error.tsx 重複五次刻意各自寫出
- ✅ 每個 step 都附上 code 或 command

### Type consistency

- ✅ `Track` / `User` / `Profile` / `FocusSession` / `Mood` / `GenerationJob` / `AuthResponse` / `StartPlaybackResponse` 在 Task 6 定義，所有後續 Task 一致使用
- ✅ `ActionResult<T>` 在 Task 6 定義，Task 10-12 一致回傳
- ✅ `usePlayerStore` action 名稱（`playTrack`、`enqueue`、`next`、`pause`、`resume`、`setVolume`、`setPlaybackSession`）在 Task 7 定義，Task 21、25 一致使用
- ✅ `loginAction`、`signupAction`、`googleAction`、`logoutAction` 在 Task 10 定義，Task 17、18、19、20（UserMenu）一致 import
- ✅ `serverFetch` / `ApiError` / `UnauthorizedError` / `TOKEN_COOKIE` 在 Task 8 定義，後續一致使用
- ✅ `requireUser` / `getCurrentUser` 在 Task 9 定義，Task 20、25 一致使用
