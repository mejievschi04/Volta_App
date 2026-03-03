import { useEffect } from 'react';
import { useRouter } from 'expo-router';

/** Flow-ul de checkout este integrat în ecranul Coș. Această rută redirecționează la Coș. */
export default function Checkout() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/Cos');
  }, [router]);
  return null;
}
