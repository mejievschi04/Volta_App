import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

function messagesKey(userId: string | number | undefined | null) {
  return ['messages', userId] as const;
}

async function fetchMessages(userId: string | number) {
  const { data, error } = await apiClient.getMessages(userId);
  if (error) throw new Error(error);
  return Array.isArray(data) ? data : [];
}

export function useMessages(
  userId: string | number | undefined | null,
  options?: Partial<UseQueryOptions<unknown[]>>
) {
  return useQuery({
    queryKey: messagesKey(userId),
    queryFn: () => fetchMessages(userId!),
    enabled: !!userId,
    ...options,
  });
}

export { messagesKey };
