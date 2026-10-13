import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	output: 'standalone',
	images: {
		remotePatterns: [
			{ hostname: '*.kakaocdn.net' },
			{ hostname: 'avatars.githubusercontent.com' },
			{ hostname: 'lh3.googleusercontent.com' },
		],
	},
};

export default nextConfig;
