import React, { useState } from 'react';
import { useProducts } from './hooks/useProducts';
import { Header } from './components/Header';
import { MetricStats } from './components/MetricStats';
import { TabsNavigation } from './components/TabsNavigation';
import { RadarGrid } from './components/RadarGrid';
import { HistoryTable } from './components/HistoryTable';
import { ToastNotification } from './components/ToastNotification';
import { QuickEditModal } from './components/QuickEditModal';
import { Product } from './types/product';
import { Sparkles, ArrowUpRight, Database, Info, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const {
    radarProducts,
    historyProducts,
    activeTab,
    setActiveTab,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    metrics,
    loading,
    isFetchingML,
    isUsingSupabase,
    fetchNewMLOffers,
    copyProductData,
    markAsPublished,
    restoreToRadar,
    updateProductCopy,
    toast,
    hideToast
  } = useProducts();

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showSupabaseGuide, setShowSupabaseGuide] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      
      {/* Cabeçalho Fixo com Logo, Botão Buscar Ofertas ML e Filtro de Categoria */}
      <Header
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        isUsingSupabase={isUsingSupabase}
        onFetchMLOffers={fetchNewMLOffers}
        isFetchingML={isFetchingML}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Barra de Métricas Chave */}
        <MetricStats metrics={metrics} />

        {/* Banner de Boas-vindas / Ação de Garimpo se o radar estiver vazio */}
        {radarProducts.length === 0 && !loading && (
          <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-slate-100 border border-amber-300/60 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-400 text-slate-950 rounded-xl font-bold shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Radar do Dia Atualizado em Tempo Real
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Clique no botão <strong className="text-slate-900">🔄 Buscar Novas Ofertas ML</strong> no topo para garimpar descontos de oportunidade na API do Mercado Livre e sincronizar no Supabase.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={fetchNewMLOffers}
                disabled={isFetchingML}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingML ? 'animate-spin' : ''}`} />
                <span>{isFetchingML ? 'Garimpando ML...' : 'Iniciar Garimpo ML'}</span>
              </button>
              <button
                onClick={() => setShowSupabaseGuide(!showSupabaseGuide)}
                className="text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-2 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-amber-600" />
                <span>Status Supabase</span>
              </button>
            </div>
          </div>
        )}

        {/* Guia Expansível de Conexão Supabase */}
        {showSupabaseGuide && (
          <div className="mb-6 p-5 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 text-xs font-mono shadow-xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 font-sans">
              <h3 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                ⚡ Status da Integração Supabase & Vercel
              </h3>
              <button
                onClick={() => setShowSupabaseGuide(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="font-sans text-slate-300 mb-3 leading-relaxed">
              O sistema lê e grava diretamente na tabela <code className="text-amber-300">products</code> do Supabase via Rota de API <code className="text-amber-300">api/search-ml.ts</code> e variáveis de ambiente na Vercel:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800/80">
              <li><code className="text-amber-400">VITE_SUPABASE_URL</code> (ou <code className="text-amber-400">SUPABASE_URL</code>) configurada no painel Vercel.</li>
              <li><code className="text-amber-400">VITE_SUPABASE_ANON_KEY</code> (ou <code className="text-amber-400">SUPABASE_ANON_KEY</code>) configurada no painel Vercel.</li>
              <li>Status de Conexão Atual: <strong className={isUsingSupabase ? "text-emerald-400" : "text-amber-400"}>{isUsingSupabase ? "Conectado ao Supabase PostgreSQL" : "Aguardando variáveis na Vercel / Local"}</strong></li>
            </ol>
          </div>
        )}

        {/* Navegação por Abas + Barra de Pesquisa */}
        <TabsNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          radarCount={radarProducts.length}
          historyCount={historyProducts.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Conteúdo Dinâmico da Aba Selecionada */}
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold">Sincronizando produtos do garimpo...</p>
          </div>
        ) : activeTab === 'radar' ? (
          <RadarGrid
            products={radarProducts}
            selectedCategory={selectedCategory}
            onCopy={copyProductData}
            onPublish={markAsPublished}
            onEditCopy={setEditingProduct}
            onResetFilters={() => {
              setSelectedCategory('Todas');
              setSearchQuery('');
            }}
          />
        ) : (
          <HistoryTable
            products={historyProducts}
            onCopy={copyProductData}
            onRestore={restoreToRadar}
          />
        )}

      </main>

      {/* Modal de Edição de Copy */}
      <QuickEditModal
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onSave={updateProductCopy}
        onCopy={copyProductData}
      />

      {/* Notificação Flutuante de Cópia / Sucesso (Toast) */}
      <ToastNotification toast={toast} onClose={hideToast} />

      {/* Rodapé Interno da Aplicação */}
      <footer className="mt-12 bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">Ysa Garimpo Automático (YGA)</span>
            <span>•</span>
            <span>Motor de Garimpo Mercado Livre</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> MLB API Realtime
            </span>
            <a
              href="https://api.mercadolibre.com/sites/MLB/search?q=mop%20giratorio&limit=50"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-600 flex items-center gap-1 transition-colors"
            >
              API Mercado Livre <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
};
