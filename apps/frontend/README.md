# next-template

개인 프로젝트용 Next.js 초기 세팅 템플릿.

## 스택

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS v4
- ESLint 9 (`eslint-config-next` + `eslint-config-prettier` + `eslint-plugin-unused-imports`)
- Prettier (tabs, printWidth 120) + `prettier-plugin-tailwindcss`/`classnames`/`merge`
- Vitest + Testing Library (jsdom)
- pnpm

## 구조 (FSD)

```
app/      Next.js App Router (라우팅 전용, 얇게 유지)
src/
  widgets/
  features/
  entities/
  shared/
```

`app/`은 라우팅만 담당하고, 실제 로직/컴포넌트는 `src/` 아래 FSD 레이어에서 관리한다. import는 `@/widgets/...`, `@/features/...` 등 `@/` alias 사용.

## 새 프로젝트 시작하기

```bash
gh repo create <새프로젝트명> --template Se9oo/next-template --clone
cd <새프로젝트명>
pnpm install
```

## 스크립트

```bash
pnpm dev            # 개발 서버
pnpm build           # 프로덕션 빌드
pnpm lint            # ESLint
pnpm format          # Prettier 적용
pnpm format:check    # Prettier 검사만
pnpm test            # Vitest 실행
pnpm test:watch      # Vitest watch 모드
```

## 컨벤션

커밋 컨벤션, TDD 워크플로우, 금지사항 등은 [`CLAUDE.md`](./CLAUDE.md) 참고.
