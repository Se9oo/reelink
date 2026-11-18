import { lookup } from 'node:dns';
import { BlockList, isIP, type LookupFunction } from 'node:net';
import { Agent, buildConnector } from 'undici';

const privateRanges = new BlockList();

for (const [network, prefix] of [
	['0.0.0.0', 8],
	['10.0.0.0', 8],
	['100.64.0.0', 10],
	['127.0.0.0', 8],
	['169.254.0.0', 16],
	['172.16.0.0', 12],
	['192.168.0.0', 16],
	['224.0.0.0', 3],
] as const) {
	privateRanges.addSubnet(network, prefix, 'ipv4');
}

for (const [network, prefix] of [
	['::', 128],
	['::1', 128],
	['fc00::', 7],
	['fe80::', 10],
	['ff00::', 8],
] as const) {
	privateRanges.addSubnet(network, prefix, 'ipv6');
}

/**
 * 서버가 요청해도 되는 공개 IP인지 확인한다. 사설·루프백·링크 로컬(클라우드 메타데이터 포함)·CGNAT·멀티캐스트 대역과 IP가 아닌 값은 false.
 * @param address string
 * @returns boolean
 */
export function isPublicAddress(address: string): boolean {
	const family = isIP(address);

	return family !== 0 && !privateRanges.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

const publicLookup: LookupFunction = (hostname, options, callback) => {
	lookup(hostname, options, (error, address, family) => {
		if (error) {
			callback(error, address, family);
			return;
		}

		const addresses = Array.isArray(address) ? address.map((entry) => entry.address) : [address];

		if (!addresses.every(isPublicAddress)) {
			callback(new Error(`내부 주소로는 요청하지 않습니다: ${hostname}`), address, family);
			return;
		}

		callback(null, address, family);
	});
};

const connectPublic = buildConnector({ lookup: publicLookup });

export const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

/**
 * 공개 IP에만 연결하는 undici dispatcher. 사용자가 저장한 URL로 서버가 요청할 때(SSRF 방지) fetch에 넘긴다.
 * 연결할 때마다 검사하므로 리다이렉트로 내부 주소로 넘어가거나 DNS 결과가 바뀌어도 막힌다.
 * IP로 적은 주소는 DNS 조회를 거치지 않아 따로 검사한다.
 */
export const publicDispatcher = new Agent({
	maxResponseSize: MAX_RESPONSE_SIZE,
	connect: (options, callback) => {
		const host = options.hostname.replace(/^\[|\]$/g, '');

		if (isIP(host) && !isPublicAddress(host)) {
			callback(new Error(`내부 주소로는 요청하지 않습니다: ${host}`), null);
			return;
		}

		connectPublic(options, callback);
	},
});
