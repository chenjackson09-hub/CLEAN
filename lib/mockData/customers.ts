import type { CustomerResult } from '@/lib/types/customer'

export const MOCK_CUSTOMERS: CustomerResult[] = [
  { id: '1', full_name: 'Maya Cohen', email: 'maya.cohen@example.com', phone: '050-111-1111', address: '12 Rothschild Blvd, Tel Aviv' },
  { id: '2', full_name: 'Noa Shapira', email: 'noa.shapira@example.com', phone: '052-444-7777', address: "8 HaArba'a St, Tel Aviv" },
  { id: '3', full_name: 'Itai Ben-David', email: 'itai.bendavid@example.com', phone: '054-888-2222', address: '45 Dizengoff St, Tel Aviv' },
  { id: '4', full_name: 'Shira Azulay', email: 'shira.azulay@example.com', phone: '050-666-3333', address: '3 Herzl St, Herzliya' },
  { id: '5', full_name: 'Roni Levi', email: 'roni.levi@example.com', phone: '053-222-9999', address: '21 Allenby St, Tel Aviv' },
]
