import React, { useState } from 'react';
import { Product } from '../types/product';
import { Copy, Check, ExternalLink, Calendar, Star, Edit3, Tag, ChevronDown, ChevronUp, Link as LinkIcon } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onCopy: (product: Product) => Promise<boolean>;
  onPublish: (productId: string) => void;
  onEditCopy?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onCopy,
  onPublish,
  onEditCopy
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedLinkOnly, setCopiedLinkOnly] = useState<boolean>(false);
  const [isCopyExpanded, setIsCopyExpanded] = useState<boolean>(false);

  const handleCopyClick = async () => {
    const success = await onCopy(product);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Copiar estritamente o Link Original do produto para o app Mercado Livre Criadores
  const handleCopyOriginalLink = async () => {
    try {
      const urlToCopy = product.affiliateLink;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(urlToCopy);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = urlToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopiedLinkOnly(true);
      setTimeout(() => setCopiedLinkOnly(false), 2500);
    } catch (err) {
      console.error('Erro ao copiar link original:', err);
    }
  };

  // Formatação de Moeda Brasileira
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const isHighDiscount = product.discountPercentage >= 40;

  return (
    <article className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden flex flex-col justify-between shadow-subtle hover:shadow-premium card-hover-transition border-t-2 border-t-transparent hover:border-t-amber-400">
      
      {/* SEÇÃO SUPERIOR (40% de Altura): Imagem do Produto + Badges */}
      <div className="relative h-48 w-full bg-slate-100 overflow-hidden border-b border-slate-100 flex items-center justify-center p-3">
        
        {/* Imagem do Produto */}
        <img
          src={product.imageUrl}
          alt={product.title}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Badge do Canto Superior Esquerdo: Porcentagem de Desconto */}
        <div className="absolute top-3 left-3 z-10">
          <div
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-black text-sm tracking-tight shadow-md text-white ${
              isHighDiscount 
                ? 'bg-emerald-600 ring-2 ring-emerald-400/40' 
                : 'bg-rose-600 ring-2 ring-rose-400/40'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>-{product.discountPercentage}% OFF</span>
          </div>
        </div>

        {/* Canto Superior Direito: Categoria & Link Mercado Livre */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-900/80 backdrop-blur-md text-white shadow-sm">
            {product.category}
          </span>
          <a
            href={product.affiliateLink}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir anúncio no Mercado Livre"
            className="p-1.5 rounded-full bg-white/90 backdrop-blur-md text-slate-700 hover:text-amber-600 hover:bg-white transition-colors shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Avaliação e ID ML no rodapé da imagem */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] font-semibold text-slate-500 bg-white/85 backdrop-blur-sm px-2.5 py-1 rounded-md border border-slate-200/50">
          <span className="flex items-center gap-1 text-amber-600">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {product.rating || 4.8} ({product.reviewsCount || 120})
          </span>
          <span className="text-slate-400">ML ID: {product.mlId || 'MLB'}</span>
        </div>

      </div>

      {/* SEÇÃO INTERMEDIÁRIA: Conteúdo do Produto & Copy */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        
        <div>
          {/* Título focado na Copy */}
          <h2 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 mb-2 group-hover:text-slate-950">
            {product.title}
          </h2>

          {/* Seção de Preços (Tachado vs Com Desconto) */}
          <div className="flex items-baseline gap-2 mb-3.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 line-through font-medium">
                De {formatBRL(product.originalPrice)}
              </span>
              <span className="text-lg font-black text-slate-900 tracking-tight">
                Por {formatBRL(product.discountPrice)}
              </span>
            </div>
            <span className="ml-auto text-xs font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md">
              Economia de {formatBRL(product.originalPrice - product.discountPrice)}
            </span>
          </div>

          {/* Caixa de Texto da Copy */}
          <div className="relative mb-4 bg-slate-900 text-slate-100 rounded-xl p-3 border border-slate-800 text-xs font-mono">
            <div className="flex items-center justify-between text-[11px] font-sans font-semibold text-slate-400 pb-2 border-b border-slate-800 mb-2">
              <span className="flex items-center gap-1 text-amber-400">
                ✨ Copy Persuasiva (Pronta para Instagram)
              </span>
              {onEditCopy && (
                <button
                  onClick={() => onEditCopy(product)}
                  className="hover:text-white flex items-center gap-1 transition-colors"
                  title="Editar texto da Copy"
                >
                  <Edit3 className="w-3 h-3" /> Editar
                </button>
              )}
            </div>

            {/* Conteúdo da Copy */}
            <div
              className={`overflow-y-auto whitespace-pre-line text-slate-200 transition-all ${
                isCopyExpanded ? 'max-h-60' : 'max-h-24'
              }`}
            >
              {product.copyText}
            </div>

            {product.copyText.length > 150 && (
              <button
                onClick={() => setIsCopyExpanded(!isCopyExpanded)}
                className="mt-2 text-[11px] font-sans font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 justify-center w-full pt-1 border-t border-slate-800/80"
              >
                {isCopyExpanded ? (
                  <>Ver menos <ChevronUp className="w-3 h-3" /></>
                ) : (
                  <>Ver copy completa <ChevronDown className="w-3 h-3" /></>
                )}
              </button>
            )}
          </div>
        </div>

        {/* SEÇÃO INFERIOR: Botões de Ação Principais */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          
          {/* 1. Botão Primário Largo: Copiar Copy + Link */}
          <button
            id={`copy-btn-${product.id}`}
            onClick={handleCopyClick}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                : 'bg-amber-400 text-slate-950 hover:bg-amber-300 border border-amber-500/30 shadow-amber-500/10'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>Copiado com Sucesso!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 stroke-[2.5]" />
                <span>Copiar Copy + Link</span>
              </>
            )}
          </button>

          {/* 2. Botão Estratégico: Copiar Link Original (Para o app ML Criadores) */}
          <button
            id={`copy-original-btn-${product.id}`}
            onClick={handleCopyOriginalLink}
            className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
              copiedLinkOnly
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Copiar URL original para converter no aplicativo do Mercado Livre Criadores"
          >
            {copiedLinkOnly ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Link Original Copiado!</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Copiar Link Original</span>
              </>
            )}
          </button>

          {/* 3. Botão Secundário: Marcar como Publicado */}
          <button
            id={`publish-btn-${product.id}`}
            onClick={() => onPublish(product.id)}
            className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Marcar como Publicado</span>
          </button>

        </div>

      </div>

    </article>
  );
};
