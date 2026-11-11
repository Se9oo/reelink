import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	output: 'standalone',
	async headers() {
		return [
			{
				source: '/sw.js',
				headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
			},
		];
	},
	images: {
		remotePatterns: [
			{ hostname: '*.kakaocdn.net' },
			{ hostname: 'avatars.githubusercontent.com' },
			{ hostname: 'lh3.googleusercontent.com' },
		],
	},
};

export default nextConfig;
