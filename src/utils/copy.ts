import { Product } from '../types/product';

const DAY_MS = 24 * 60 * 60 * 1000;

// Produto que o garimpo não encontra há 3 dias provavelmente saiu de oferta
export function isOfferFresh(product: Product): boolean {
  return Date.now() - new Date(product.lastSeenAt).getTime() < 3 * DAY_MS;
}

export function isNewProduct(product: Product): boolean {
  return Date.now() - new Date(product.createdAt).getTime() < DAY_MS;
}

export const formatBRL = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Link de afiliado = qualquer link diferente do link cru do anúncio (ex.: meli.la/...)
export function hasAffiliateLink(product: Product): boolean {
  return Boolean(product.affiliateLink) && product.affiliateLink !== product.originalLink;
}

// Copy gerada na hora com o preço atual do garimpo; a copy editada pela Ysa tem prioridade
export function getCopyText(product: Product): string {
  if (product.copyText.trim()) return product.copyText;

  return `🔥 ACHADO DO MERCADO LIVRE!
${product.title}

❌ De ${formatBRL(product.originalPrice)}
✅ Por ${formatBRL(product.discountPrice)} (-${product.discountPercentage}% OFF) 🚨

💸 Economia de ${formatBRL(product.originalPrice - product.discountPrice)}
⚠️ Preço sujeito a alteração — garanta o seu antes que acabe!`;
}

export function buildShareText(product: Product): string {
  return `${getCopyText(product)}\n\n🛒 Compre aqui: ${product.affiliateLink}`;
}
