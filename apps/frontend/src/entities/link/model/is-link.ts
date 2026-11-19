import { Link } from '@/entities/link/model/types';

export function isLink(value: unknown): value is Link {
	return typeof value === 'object' && value !== null && 'id' in value && 'thumbnailUrl' in value;
}
