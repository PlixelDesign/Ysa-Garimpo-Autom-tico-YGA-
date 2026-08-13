import React from 'react';
import { Product, FilterCategoryType } from '../types/product';
import { ProductCard } from './ProductCard';
import { Flame, Sparkles, FilterX } from 'lucide-react';

interface RadarGridProps {
  products: Product[];
  selectedCategory: FilterCategoryType;
  onCopy: (product: Product) => Promise<boolean>;
  onPublish: (productId: string) => void;
  onEditCopy?: (product: Product) => void;
  onResetFilters: () => void;
}

export const RadarGrid: React.FC<RadarGridProps> = ({
  products,
  selectedCategory,
  onCopy,
  onPublish,
  onEditCopy,
  onResetFilters
}) => {
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-subtle my-8">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl border border-amber-200 text-amber-500 flex items-center justify-center mx-auto mb-4">
          <FilterX className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">
          Nenhum produto encontrado no Radar
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          {selectedCategory !== 'Todas'
            ? `Não há produtos pendentes na categoria "${selectedCategory}".`
            : 'Todos os produtos garimpados hoje já foram publicados ou filtrados!'}
        </p>
        <button
          onClick={onResetFilters}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors"
        >
          Limpar Filtros & Ver Todos
        </button>
      </div>
    );
  }

  return (
    <section aria-label="Radar do Dia - Produtos de Maior Desconto">
      
      {/* Banner Informativo de Regra de Negócio */}
      <div className="flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-3.5 rounded-xl border border-amber-300/40 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-400 text-slate-950 rounded-lg font-black shadow-sm">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              Ordenação Automática: Maior Desconto (%) no Topo
            </h2>
            <p className="text-xs text-slate-600">
              Exibindo <span className="font-bold text-slate-900">{products.length}</span> produtos garimpados com copy pronta para publicação.
            </p>
          </div>
        </div>
        <span className="hidden md:inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
          <Sparkles className="w-3.5 h-3.5" /> Alta Conversão
        </span>
      </div>

      {/* Grid de Cards: 1 coluna em mobile, 2 em tablet, 3 em desktop, 4 em telas xl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onCopy={onCopy}
            onPublish={onPublish}
            onEditCopy={onEditCopy}
          />
        ))}
      </div>

    </section>
  );
};
