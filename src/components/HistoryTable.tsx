import React, { useState } from 'react';
import { Product } from '../types/product';
import { Copy, Check, ExternalLink, RotateCcw, Calendar, ShoppingBag } from 'lucide-react';

interface HistoryTableProps {
  products: Product[];
  onCopy: (product: Product) => Promise<boolean>;
  onRestore: (productId: string) => void;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  products,
  onCopy,
  onRestore
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = async (product: Product) => {
    const success = await onCopy(product);
    if (success) {
      setCopiedId(product.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Publicado recentemente';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-subtle my-8">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl border border-blue-200 text-blue-500 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">
          Nenhum produto no Histórico
        </h3>
        <p className="text-sm text-slate-500">
          Quando você clicar em "Marcar como Publicado" nos cards do Radar, os produtos aparecerão organizados nesta tabela.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden">
      
      {/* Cabeçalho da Tabela */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Histórico de Postagens no Instagram ({products.length})
          </h2>
          <p className="text-xs text-slate-500">
            Registro completo de produtos validados e encaminhados para agendamento.
          </p>
        </div>
      </div>

      {/* Tabela Responsiva no estilo Vercel / Stripe */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th scope="col" className="py-3 px-4">Miniatura</th>
              <th scope="col" className="py-3 px-4">Título do Produto</th>
              <th scope="col" className="py-3 px-4">Categoria</th>
              <th scope="col" className="py-3 px-4">Preço com Desconto</th>
              <th scope="col" className="py-3 px-4">Data de Publicação</th>
              <th scope="col" className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {products.map((product) => {
              const isItemCopied = copiedId === product.id;

              return (
                <tr
                  key={product.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  {/* Coluna 1: Imagem em Miniatura */}
                  <td className="py-3 px-4 w-16">
                    <div className="h-12 w-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center p-1 relative">
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="h-full w-full object-contain"
                      />
                      <span className="absolute bottom-0.5 right-0.5 text-[9px] font-black bg-emerald-600 text-white px-1 rounded">
                        -{product.discountPercentage}%
                      </span>
                    </div>
                  </td>

                  {/* Coluna 2: Título do Produto */}
                  <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs">
                    <div className="line-clamp-2">{product.title}</div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                      ML ID: {product.mlId || 'MLB'}
                    </div>
                  </td>

                  {/* Coluna 3: Categoria */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {product.category}
                    </span>
                  </td>

                  {/* Coluna 4: Preço */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-bold text-slate-900">
                      {formatBRL(product.discountPrice)}
                    </div>
                    <div className="text-xs text-slate-400 line-through">
                      {formatBRL(product.originalPrice)}
                    </div>
                  </td>

                  {/* Coluna 5: Data de Publicação */}
                  <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600">
                    <div className="font-medium text-slate-900">
                      {formatDate(product.publishedAt)}
                    </div>
                    <div className="text-[11px] text-slate-400">Via Painel YGA</div>
                  </td>

                  {/* Coluna 6: Botões de Ação */}
                  <td className="py-3 px-4 whitespace-nowrap text-right space-x-2">
                    {/* Botão Copiar Link */}
                    <button
                      onClick={() => handleCopyLink(product)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all shadow-sm ${
                        isItemCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-500/30'
                      }`}
                      title="Copiar Copy + Link de Afiliado novamente"
                    >
                      {isItemCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar Link
                        </>
                      )}
                    </button>

                    {/* Botão Restaurar */}
                    <button
                      onClick={() => onRestore(product.id)}
                      className="inline-flex items-center gap-1 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
                      title="Voltar produto para o Radar do Dia"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Link Externo */}
                    <a
                      href={product.affiliateLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-200/60 rounded-lg transition-colors"
                      title="Abrir no Mercado Livre"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
