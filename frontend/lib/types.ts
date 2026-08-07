export type PriceTier = {
  moq: number | string | null;
  harga_grosir: number | null;
};

export type Product = {
  id: number;
  name: string;
  category: string | null;
  variants: string | null;
  bandrol: number | null;
  harga_jual: number | null;
  image: string | null;
  tiers: PriceTier[];
};
