'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import '@/shared/lib/install-prompt';
import '@/shared/lib/visual-viewport';

export function QueryProvider({ children }: { children: ReactNode }) {
	const [queryClient] = useState(() => new QueryClient());

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
