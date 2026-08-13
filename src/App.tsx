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
import { Sparkles, ArrowUpRight, Database, Info } from 'lucide-react';

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
    isUsingSupabase,
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
      
      {/* Cabeçalho Fixo com Logo e Filtro de Categoria */}
      <Header
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        isUsingSupabase={isUsingSupabase}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Barra de Métricas Chave */}
        <MetricStats metrics={metrics} />

        {/* Banner Informativo de Conexão Supabase / Mock */}
        {!isUsingSupabase && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-slate-100 border border-amber-300/60 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-400 text-slate-950 rounded-lg font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  Exibindo Dados Garimpados (Mock Realista ML)
                </h2>
                <p className="text-xs text-slate-600">
                  Pronto para conectar ao Supabase PostgreSQL com 1 clique! Insira as credenciais no arquivo <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-amber-900">.env</code>.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSupabaseGuide(!showSupabaseGuide)}
              className="text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1 whitespace-nowrap self-end sm:self-auto cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-amber-600" />
              {showSupabaseGuide ? 'Ocultar Instruções' : 'Ver Guia Supabase'}
            </button>
          </div>
        )}

        {/* Guia Expansível de Conexão Supabase */}
        {showSupabaseGuide && (
          <div className="mb-6 p-5 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 text-xs font-mono shadow-xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 font-sans">
              <h3 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                ⚡ Como Injetar a Chamada da API Supabase
              </h3>
              <button
                onClick={() => setShowSupabaseGuide(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="font-sans text-slate-300 mb-3 leading-relaxed">
              O projeto já possui as funções prontas e abstraídas em <code className="text-amber-300">src/services/supabase.ts</code> e no hook <code className="text-amber-300">src/hooks/useProducts.ts</code>. Para conectar seu banco real:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800/80">
              <li>Crie um arquivo <code className="text-amber-400">.env</code> na raiz do projeto baseado no <code className="text-amber-400">.env.example</code>.</li>
              <li>Adicione sua <code className="text-amber-400">VITE_SUPABASE_URL</code> e <code className="text-amber-400">VITE_SUPABASE_ANON_KEY</code>.</li>
              <li>Crie a tabela <code className="text-amber-400">products</code> no Supabase utilizando o SQL fornecido no arquivo <code className="text-amber-400">src/services/supabase.ts</code>.</li>
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
            <p className="text-sm font-semibold">Carregando produtos do garimpo...</p>
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
            <span>Back-Office de Afiliados Mercado Livre</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Instagram MLabs Optimized
            </span>
            <a
              href="https://mercadolivre.com.br"
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
