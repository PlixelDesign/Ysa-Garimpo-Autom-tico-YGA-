import React from 'react';
import { FilterCategoryType } from '../types/product';
import { Filter, CheckCircle2, Zap, RefreshCw } from 'lucide-react';

interface HeaderProps {
  selectedCategory: FilterCategoryType;
  onSelectCategory: (category: FilterCategoryType) => void;
  isUsingSupabase: boolean;
  onFetchMLOffers: () => void;
  isFetchingML: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  selectedCategory,
  onSelectCategory,
  isUsingSupabase,
  onFetchMLOffers,
  isFetchingML
}) => {
  const categories: FilterCategoryType[] = [
    'Todas',
    'Utilidades do Lar',
    'Decoração',
    'Tecnologia'
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Esquerda: Logo Marca "Ysa Garimpo" */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950 font-black text-xl tracking-wider">
              Y
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  Ysa Garimpo
                  <span className="text-xs px-2 py-0.5 font-semibold rounded-full bg-amber-100 text-amber-900 border border-amber-300/60">
                    Afiliados ML
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Painel de Curadoria & Postagem Rápida no Instagram
              </p>
            </div>
          </div>

          {/* Centro / Status do Sistema */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 border border-slate-200/80 text-xs font-medium text-slate-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Status:</span>
            <span className="font-semibold text-slate-900 flex items-center gap-1">
              {isUsingSupabase ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Supabase Synchronized
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Modo Leitura Ativo
                </>
              )}
            </span>
          </div>

          {/* Direita: Botão '🔄 Atualizar Tela' + Dropdown de Categorias */}
          <div className="flex items-center gap-2.5">
            
            {/* Botão Refetch Supabase */}
            <button
              id="btn-fetch-ml-offers"
              onClick={onFetchMLOffers}
              disabled={isFetchingML}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 ${
                isFetchingML
                  ? 'bg-amber-100 text-amber-900 border-amber-300 opacity-80 cursor-not-allowed'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-300'
              }`}
              title="Recarregar produtos gravados na tabela products do Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isFetchingML ? 'animate-spin' : ''}`} />
              <span>{isFetchingML ? 'Sincronizando...' : '🔄 Atualizar Tela'}</span>
            </button>

            {/* Dropdown de Filtro de Categorias */}
            <div className="relative flex items-center">
              <div className="absolute left-3 pointer-events-none text-slate-400">
                <Filter className="w-4 h-4" />
              </div>
              <select
                id="category-filter-dropdown"
                value={selectedCategory}
                onChange={(e) => onSelectCategory(e.target.value as FilterCategoryType)}
                className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none transition-all cursor-pointer shadow-sm hover:bg-slate-100 hover:border-slate-300"
                aria-label="Filtrar por Categoria"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'Todas' ? 'Todas as Categorias' : cat}
                  </option>
                ))}
              </select>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
