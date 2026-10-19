import { describe, expect, test } from 'vitest';

import { getActivatorClientY } from '@/widgets/folder-list/model/get-activator-client-y';

describe('getActivatorClientY', () => {
	test('마우스 이벤트는 clientY를 돌려준다', () => {
		expect(getActivatorClientY({ clientY: 120 } as unknown as Event)).toBe(120);
	});

	test('터치 이벤트는 첫 번째 터치의 clientY를 돌려준다', () => {
		expect(getActivatorClientY({ touches: [{ clientY: 240 }] } as unknown as Event)).toBe(240);
	});

	test('좌표를 알 수 없는 이벤트는 null을 돌려준다', () => {
		expect(getActivatorClientY({ touches: [] } as unknown as Event)).toBeNull();
		expect(getActivatorClientY({} as unknown as Event)).toBeNull();
	});
});
