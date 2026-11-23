export type Slot = 'hat' | 'scarf' | 'boat' | 'color';

export interface ShopItem {
  id: string;
  slot: Slot;
  name: string;
  price: number;
  preview: string; // emoji or color hex
}

export const SHOP: ShopItem[] = [
  { id: 'color-gold', slot: 'color', name: 'Emas', price: 0, preview: '#FBBF24' },
  { id: 'color-mint', slot: 'color', name: 'Hijau Mint', price: 30, preview: '#34D399' },
  { id: 'color-sky', slot: 'color', name: 'Biru Langit', price: 30, preview: '#60A5FA' },
  { id: 'color-pink', slot: 'color', name: 'Merah Muda', price: 30, preview: '#F472B6' },
  { id: 'color-purple', slot: 'color', name: 'Ungu', price: 40, preview: '#A78BFA' },
  { id: 'hat-peci', slot: 'hat', name: 'Peci Hitam', price: 40, preview: '🧢' },
  { id: 'hat-white', slot: 'hat', name: 'Kopiah Putih', price: 50, preview: '⚪' },
  { id: 'hat-explorer', slot: 'hat', name: 'Topi Penjelajah', price: 80, preview: '🤠' },
  { id: 'hat-crown', slot: 'hat', name: 'Mahkota Hafiz', price: 300, preview: '👑' },
  { id: 'scarf-red', slot: 'scarf', name: 'Syal Merah', price: 30, preview: '🧣' },
  { id: 'scarf-green', slot: 'scarf', name: 'Syal Hijau', price: 30, preview: '💚' },
  { id: 'scarf-blue', slot: 'scarf', name: 'Syal Biru', price: 30, preview: '💙' },
  { id: 'boat-canoe', slot: 'boat', name: 'Perahu Kecil', price: 0, preview: '🛶' },
  { id: 'boat-sail', slot: 'boat', name: 'Perahu Layar', price: 60, preview: '⛵' },
  { id: 'boat-speed', slot: 'boat', name: 'Speedboat', price: 120, preview: '🚤' },
  { id: 'boat-ship', slot: 'boat', name: 'Kapal Besar', price: 250, preview: '🚢' },
];

export const itemOf = (id?: string) => SHOP.find((i) => i.id === id);
