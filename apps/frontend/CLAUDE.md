@AGENTS.md

## 커밋 컨벤션

- 한국어로 작성
- 접두사: `feat(frontend):`, `fix(frontend):`, `modify(frontend):` 등등
- 접두사 뒤에 관련 도메인 붙이기(도메인 관련 변경사항이라면): `feat(frontend): product >`, `fix(frontend): auth >`
- Co-Authored-By 라인 포함하지 않음

예시:

```
feat(frontend): product > 소프트 딜리트 상품 하드 딜리트 cron 추가
fix(frontend): auth > 로그인 후 본인인증 시 불필요한 DI 중복 체크 제거
modify(frontend): batch > 헤더 체크 로직 변경
chore(frontend): eslint 설정
```

## 개발 워크플로우 (TDD)

Red → Green → Refactor 순서로 진행

1. **Red** - 기능 요구사항을 테스트로 먼저 작성 (`*.test.ts`)
2. **Green** - 테스트를 통과하는 최소한의 구현
3. **Refactor** - 테스트가 통과한 상태에서 코드 개선

## 아키텍처 (FSD)

- `app/`(레포 루트): Next.js App Router 전용 (라우팅만, 얇게 유지). 각 `page.tsx`는 `src/views`의 화면 컴포넌트를 불러오기만 한다
- `src/app`, `src/views`, `src/widgets`, `src/features`, `src/entities`, `src/shared`: FSD 레이어. import는 `@/views/...`, `@/widgets/...`, `@/features/...` 등 alias 사용
- `src/views`: FSD의 `pages` 레이어. 화면 하나에서만 쓰는 본문을 둔다 (FSD 2.1 pages-first). `src/pages`라고 이름 지으면 Next가 Pages Router 폴더로 인식해 루트 `app/`과 위치가 다르다며 빌드가 실패해서 `views`로 이름 붙였다
- `src/widgets`: 여러 화면에서 다시 쓰는 블록만 둔다(`folder-list`). 한 화면에서만 쓰면 `src/views`에 둔다
- `src/app/layouts`: 모든 화면을 감싸는 앱 레이아웃(`app-shell`: 사이드바, 하단 탭, 모바일 헤더). 위젯을 조립하므로 widgets가 아니라 맨 위 app 레이어에 둔다
- `src/app`: 전역 프로바이더·세팅(예: `QueryProvider`) — 라우팅용 `app/`과 이름은 같지만 다른 레이어라 혼동 주의

## 특별 주의사항

### 절대 하지 말 것

- 타입 `any` 사용
- `console.log` 프로덕션 코드에 남기기
- Mock 데이터나 가짜 구현 사용
- 주석 함부로 삭제 금지

### 권장사항

- import는 항상 `@/` alias 사용 — 상대경로(`../`, `./`) 사용 금지
- .prettierrc 참고해서 코드 작성할 것
- 타입 안전성 보장
- 시맨틱 HTML 태그 사용 (`button` 안에 `button` 중첩 금지, 클릭 가능한 목록 항목은 `li`에 onClick 등)
- 컴포넌트 개발시 React best practices 스킬 기준으로 작성할 것
