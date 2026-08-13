import React from 'react';
import { Radar, History, Search } from 'lucide-react';

interface TabsNavigationProps {
  activeTab: 'radar' | 'history';
  onTabChange: (tab: 'radar' | 'history') => void;
  radarCount: number;
  historyCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const TabsNavigation: React.FC<TabsNavigationProps> = ({
  activeTab,
  onTabChange,
  radarCount,
  historyCount,
  searchQuery,
  onSearchChange
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-200">
      
      {/* Abas Principais (Estilo Vercel Segmented Control) */}
      <div className="inline-flex p-1 bg-slate-200/70 rounded-xl border border-slate-200/90 self-start sm:self-auto shadow-inner">
        <button
          id="tab-radar"
          onClick={() => onTabChange('radar')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all duration-150 ${
            activeTab === 'radar'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
          aria-selected={activeTab === 'radar'}
        >
          <Radar className={`w-4 h-4 ${activeTab === 'radar' ? 'text-amber-500' : 'text-slate-400'}`} />
          <span>Radar do Dia</span>
          <span
            className={`ml-1 px-2 py-0.5 text-xs font-extrabold rounded-full ${
              activeTab === 'radar'
                ? 'bg-amber-100 text-amber-900 border border-amber-300/80'
                : 'bg-slate-300/80 text-slate-700'
            }`}
          >
            {radarCount}
          </span>
        </button>

        <button
          id="tab-history"
          onClick={() => onTabChange('history')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all duration-150 ${
            activeTab === 'history'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
          aria-selected={activeTab === 'history'}
        >
          <History className={`w-4 h-4 ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400'}`} />
          <span>Histórico (Publicados)</span>
          <span
            className={`ml-1 px-2 py-0.5 text-xs font-extrabold rounded-full ${
              activeTab === 'history'
                ? 'bg-blue-100 text-blue-900 border border-blue-300/80'
                : 'bg-slate-300/80 text-slate-700'
            }`}
          >
            {historyCount}
          </span>
        </button>
      </div>

      {/* Campo de Busca Rápida */}
      <div className="relative min-w-[240px] sm:min-w-[280px]">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar produto, copy ou código..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none transition-all shadow-subtle"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded"
          >
            Limpar
          </button>
        )}
      </div>

    </div>
  );
};
