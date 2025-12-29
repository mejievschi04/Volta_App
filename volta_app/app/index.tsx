import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Defer navigation to ensure Root Layout has mounted.
    const t = setTimeout(() => {
      router.replace('/Loading'); // sau /Login sau /Home
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return null;
}
