@AGENTS.md

## 커밋 컨벤션

- 한국어로 작성
- 접두사: `feat:`, `fix:`, `modify:` 등등
- 접두사 뒤에 관련 도메인 붙이기(도메인 관련 변경사항이라면): `feat: product >`, `fix: auth >`
- Co-Authored-By 라인 포함하지 않음

예시:

```
feat: product > 소프트 딜리트 상품 하드 딜리트 cron 추가
fix: auth > 로그인 후 본인인증 시 불필요한 DI 중복 체크 제거
modify: batch > 헤더 체크 로직 변경
chore: eslint 설정
```

## 개발 워크플로우 (TDD)

Red → Green → Refactor 순서로 진행

1. **Red** - 기능 요구사항을 테스트로 먼저 작성 (`*.test.ts`)
2. **Green** - 테스트를 통과하는 최소한의 구현
3. **Refactor** - 테스트가 통과한 상태에서 코드 개선

## 아키텍처 (FSD)

- `app/`: Next.js App Router 전용 (라우팅만, 얇게 유지)
- `src/widgets`, `src/features`, `src/entities`, `src/shared`: FSD 레이어. import는 `@/widgets/...`, `@/features/...` 등 alias 사용

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
