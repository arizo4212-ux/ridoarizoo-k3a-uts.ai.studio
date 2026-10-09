import heroBannerImg from '../assets/images/hero_rupa_gems_banner_1791520027238.jpg';
import gemSapphireImg from '../assets/images/gem_sapphire_royal_1791520038873.jpg';
import gemRubyImg from '../assets/images/gem_ruby_pigeon_blood_1791520049901.jpg';
import gemEmeraldImg from '../assets/images/gem_emerald_colombian_1791520062191.jpg';
import ringPadparadschaImg from '../assets/images/ring_gold_padparadscha_1791520073201.jpg';
import pendantJadeiteImg from '../assets/images/pendant_imperial_jadeite_1791520084391.jpg';

export const HERO_BANNER_IMAGE = heroBannerImg;

export const PRODUCT_IMAGE_MAP: Record<string, string> = {
  gem_sapphire: gemSapphireImg,
  gem_ruby: gemRubyImg,
  gem_emerald: gemEmeraldImg,
  ring_padparadscha: ringPadparadschaImg,
  pendant_jadeite: pendantJadeiteImg,
  hero_banner: heroBannerImg,
};

export function resolveProductImage(imageKeyOrUrl: string): string {
  if (!imageKeyOrUrl) return gemSapphireImg;
  if (PRODUCT_IMAGE_MAP[imageKeyOrUrl]) {
    return PRODUCT_IMAGE_MAP[imageKeyOrUrl];
  }
  if (imageKeyOrUrl.startsWith('http') || imageKeyOrUrl.startsWith('data:') || imageKeyOrUrl.startsWith('/')) {
    return imageKeyOrUrl;
  }
  return gemSapphireImg;
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateID(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
