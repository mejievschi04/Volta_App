import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

const PROMO_HOME_KEY = ['promotions', 'home'] as const;
const PROMO_LIST_KEY = ['promotions', 'list'] as const;

async function fetchPromotionsHome() {
  const { data, error } = await apiClient.getSliderPromotions({ page_size: 100 });
  if (error) throw new Error(error);
  return Array.isArray(data) ? data : [];
}

async function fetchPromotions() {
  const { data, error } = await apiClient.getSliderPromotions({ page_size: 100 });
  if (error) throw new Error(error);
  return Array.isArray(data) ? data : [];
}

export function usePromotionsHome() {
  return useQuery({
    queryKey: PROMO_HOME_KEY,
    queryFn: fetchPromotionsHome,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function usePromotions() {
  return useQuery({
    queryKey: PROMO_LIST_KEY,
    queryFn: fetchPromotions,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export { PROMO_HOME_KEY, PROMO_LIST_KEY };
