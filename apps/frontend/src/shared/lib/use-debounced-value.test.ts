import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useDebouncedValue } from '@/shared/lib/use-debounced-value';

describe('useDebouncedValue', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test('처음엔 초기값을 그대로 반환한다', () => {
		const { result } = renderHook(() => useDebouncedValue('a', 300));

		expect(result.current).toBe('a');
	});

	test('값이 바뀌어도 지연 시간이 지나기 전까지는 이전 값을 유지한다', () => {
		const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
			initialProps: { value: 'a' },
		});

		rerender({ value: 'ab' });
		act(() => {
			vi.advanceTimersByTime(299);
		});

		expect(result.current).toBe('a');

		act(() => {
			vi.advanceTimersByTime(1);
		});

		expect(result.current).toBe('ab');
	});

	test('지연 중에 값이 또 바뀌면 마지막 값만 반영된다', () => {
		const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
			initialProps: { value: 'a' },
		});

		rerender({ value: 'ab' });
		act(() => {
			vi.advanceTimersByTime(200);
		});
		rerender({ value: 'abc' });
		act(() => {
			vi.advanceTimersByTime(299);
		});

		expect(result.current).toBe('a');

		act(() => {
			vi.advanceTimersByTime(1);
		});

		expect(result.current).toBe('abc');
	});
});
