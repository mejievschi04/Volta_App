/**
 * Date reale ale magazinelor Volta – coordonate GPS, ore, telefon.
 * Sursa de adevăr pentru hartă și ridicare la magazin; nu se iau din backend.
 */

export interface VoltaStore {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  hours: string;
  phone: string;
}

/** Lista fixă a magazinelor Volta (date reale) */
export const VOLTA_STORES: VoltaStore[] = [
  { id: 1, name: 'Service Centru', latitude: 47.019253274004505, longitude: 28.864151533617296, hours: 'Luni - Vineri: 09:00 - 18:00\nSâmbătă: 09:00 - 15:00\nDuminică nu se lucrează', phone: '+37360123456' },
  { id: 2, name: 'Volta 1', latitude: 46.980650614582785, longitude: 28.890921593605434, hours: 'Luni - Vineri: 09:00 - 20:00\nSâmbătă: 09:00 - 20:00\nDuminică nu se lucrează', phone: '+37360123457' },
  { id: 3, name: 'Volta 2 "Tools"', latitude: 46.99577603566025, longitude: 28.90237267409418, hours: 'Luni - Vineri: 09:00 - 20:00\nSâmbătă: 09:00 - 20:00\nDuminică nu se lucrează', phone: '+37360123458' },
  { id: 4, name: 'Volta 3', latitude: 47.015576198461154, longitude: 28.873610152122808, hours: 'Luni - Vineri: 09:00 - 20:00\nSâmbătă: 09:00 - 20:00\nDuminică nu se lucrează', phone: '+37360123459' },
  { id: 5, name: 'Volta 4', latitude: 47.05245166859262, longitude: 28.85054384711143, hours: 'Luni - Vineri: 09:00 - 20:00\nSâmbătă: 09:00 - 20:00\nDuminică nu se lucrează', phone: '+37360123460' },
  { id: 6, name: 'Volta 5', latitude: 47.042002129366495, longitude: 28.798525077797365, hours: 'Luni - Vineri: 09:00 - 20:00\nSâmbătă: 09:00 - 20:00\nDuminică nu se lucrează', phone: '+37360123461' },
  { id: 7, name: 'Volta 6', latitude: 46.99437774555062, longitude: 28.81509673970665, hours: 'Luni - Vineri: 09:00 - 20:00\nSâmbătă: 09:00 - 20:00\nDuminică nu se lucrează', phone: '+37360123462' },
  { id: 8, name: 'Volta 7', latitude: 46.83412784551735, longitude: 28.610163620117056, hours: 'Luni - Vineri: 09:00 - 20:00\nSâmbătă: 09:00 - 20:00\nDuminică nu se lucrează', phone: '+37360123463' },
];
