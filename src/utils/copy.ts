import { Product } from '../types/product';

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
