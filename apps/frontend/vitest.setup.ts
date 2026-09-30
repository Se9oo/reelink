import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
	cleanup();
});

// jsdom은 ResizeObserver를 구현하지 않음 — seed-design 컴포넌트의 press 애니메이션 등이
// 내부적으로 사용해서, 테스트 환경에서만 아무 동작 없는 스텁으로 채워줌
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
global.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
