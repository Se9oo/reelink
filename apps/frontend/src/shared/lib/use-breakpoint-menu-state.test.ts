import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { useBreakpointMenuState } from '@/shared/lib/use-breakpoint-menu-state';

function stubMatchMedia(initial: boolean) {
	let matches = initial;
	const listeners = new Set<() => void>();

	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({
			get matches() {
				return matches;
			},
			addEventListener: (_: string, listener: () => void) => listeners.add(listener),
			removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
		})),
	);

	return (next: boolean) => {
		matches = next;
		listeners.forEach((listener) => listener());
	};
}

describe('useBreakpointMenuState', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test('열고 닫을 수 있고, 열 때는 애니메이션을 생략하지 않는다', () => {
		stubMatchMedia(true);
		const { result } = renderHook(() => useBreakpointMenuState());

		act(() => result.current.onOpenChange(true));

		expect(result.current.open).toBe(true);
		expect(result.current.instant).toBe(false);

		act(() => result.current.onOpenChange(false));

		expect(result.current.open).toBe(false);
	});

	test('열린 상태에서 화면 크기 구간이 바뀌면 애니메이션 없이 닫힌다', () => {
		const changeBreakpoint = stubMatchMedia(true);
		const { result } = renderHook(() => useBreakpointMenuState());

		act(() => result.current.onOpenChange(true));
		act(() => changeBreakpoint(false));

		expect(result.current.open).toBe(false);
		expect(result.current.instant).toBe(true);
	});
});
