import { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, FilterCategoryType, MetricSummary, ProductStatus } from '../types/product';
import { isSupabaseConfigured, fetchProductsFromSupabase, updateProductStatusInSupabase } from '../services/supabase';
import { fetchRealMercadoLivreOffers } from '../services/mlSearchService';
import confetti from 'canvas-confetti';

export interface ToastState {
  id: number;
  show: boolean;
  message: string;
  subtext?: string;
}

export function useProducts() {
  // Estado inicial 100% limpo sem dados fictícios (Mock Purge)
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'radar' | 'history'>('radar');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategoryType>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isUsingSupabase, setIsUsingSupabase] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFetchingML, setIsFetchingML] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState>({ id: 0, show: false, message: '' });

  // Carrega os produtos diretamente do Supabase na inicialização
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      if (isSupabaseConfigured()) {
        const data = await fetchProductsFromSupabase();
        if (data) {
          setProducts(data);
          setIsUsingSupabase(true);
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Exibir notificação Toast com fechamento automático
  const showToastNotification = useCallback((message: string, subtext?: string) => {
    setToast({
      id: Date.now(),
      show: true,
      message,
      subtext
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }));
  }, []);

  // Disparar busca manual de novas ofertas reais do Mercado Livre
  const fetchNewMLOffers = useCallback(async () => {
    setIsFetchingML(true);
    showToastNotification(
      'Conectando ao Mercado Livre...',
      'Buscando ofertas reais com original_price > price.'
    );

    try {
      const newOffers = await fetchRealMercadoLivreOffers('');

      if (newOffers.length === 0) {
        showToastNotification(
          'Busca Concluída',
          'Nenhuma oferta com desconto real foi encontrada no momento.'
        );
      } else {
        // Se o Supabase estiver configurado, recarrega do banco para garantir consistência
        if (isSupabaseConfigured()) {
          const freshFromSupabase = await fetchProductsFromSupabase();
          if (freshFromSupabase && freshFromSupabase.length > 0) {
            setProducts(freshFromSupabase);
          } else {
            setProducts(prev => {
              const existingIds = new Set(prev.map(p => p.mlId || p.id));
              const filteredNew = newOffers.filter(p => !existingIds.has(p.mlId || p.id));
              return [...filteredNew, ...prev];
            });
          }
        } else {
          setProducts(prev => {
            const existingIds = new Set(prev.map(p => p.mlId || p.id));
            const filteredNew = newOffers.filter(p => !existingIds.has(p.mlId || p.id));
            return [...filteredNew, ...prev];
          });
        }

        setActiveTab('radar');

        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.8 },
          colors: ['#FFE600', '#F59E0B', '#10B981']
        });

        showToastNotification(
          `⚡ ${newOffers.length} Novas Ofertas ML Garimpadas!`,
          'Produtos adicionados e ordenados por maior desconto no Radar do Dia.'
        );
      }
    } catch (err) {
      console.error('[Fetch ML Offers Error]:', err);
      showToastNotification('Erro no Garimpo ML', 'Falha ao consultar a API do Mercado Livre.');
    } finally {
      setIsFetchingML(false);
    }
  }, [showToastNotification]);

  // Copiar Copy + Link para a área de transferência
  const copyProductData = useCallback(async (product: Product) => {
    const textToCopy = `${product.copyText}\n\n🛒 Link do Produto: ${product.affiliateLink}`;
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.85 },
        colors: ['#FFE600', '#F59E0B', '#10B981', '#3B82F6']
      });

      showToastNotification(
        'Copy + Link Copiados!',
        'Pronto para colar no Instagram, Telegram ou WhatsApp.'
      );
      return true;
    } catch (err) {
      console.error('Erro ao copiar para o clipboard:', err);
      showToastNotification('Erro ao copiar', 'Tente selecionar o texto manualmente.');
      return false;
    }
  }, [showToastNotification]);

  // Marcar produto como publicado
  const markAsPublished = useCallback(async (productId: string) => {
    const nowIso = new Date().toISOString();

    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === productId || p.mlId === productId
          ? { ...p, status: 'published' as ProductStatus, publishedAt: nowIso }
          : p
      )
    );

    showToastNotification(
      'Produto movido para o Histórico!',
      'Status alterado para Publicado com sucesso.'
    );

    if (isUsingSupabase) {
      await updateProductStatusInSupabase(productId, 'published');
    }
  }, [isUsingSupabase, showToastNotification]);

  // Restaurar produto do Histórico para o Radar
  const restoreToRadar = useCallback(async (productId: string) => {
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === productId || p.mlId === productId
          ? { ...p, status: 'pending' as ProductStatus, publishedAt: undefined }
          : p
      )
    );

    showToastNotification(
      'Restaurado para o Radar do Dia',
      'O produto já está visível novamente no Radar.'
    );

    if (isUsingSupabase) {
      await updateProductStatusInSupabase(productId, 'pending');
    }
  }, [isUsingSupabase, showToastNotification]);

  // Atualizar a Copy de um produto
  const updateProductCopy = useCallback((productId: string, newCopyText: string) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId || p.mlId === productId ? { ...p, copyText: newCopyText } : p))
    );
    showToastNotification('Copy Atualizada!', 'As alterações foram salvas com sucesso.');
  }, [showToastNotification]);

  // RADAR DO DIA: Ordenado SEMPRE por maior desconto (%)
  const radarProducts = useMemo(() => {
    return products
      .filter(p => p.status === 'pending')
      .filter(p => selectedCategory === 'Todas' || p.category === selectedCategory)
      .filter(p => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.copyText.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.discountPercentage - a.discountPercentage);
  }, [products, selectedCategory, searchQuery]);

  // HISTÓRICO: Ordenado por publicação mais recente
  const historyProducts = useMemo(() => {
    return products
      .filter(p => p.status === 'published')
      .filter(p => selectedCategory === 'Todas' || p.category === selectedCategory)
      .filter(p => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.publishedAt || 0).getTime();
        const dateB = new Date(b.publishedAt || 0).getTime();
        return dateB - dateA;
      });
  }, [products, selectedCategory, searchQuery]);

  // Métricas
  const metrics = useMemo<MetricSummary>(() => {
    const pendingList = products.filter(p => p.status === 'pending');
    const publishedList = products.filter(p => p.status === 'published');
    
    const maxDiscount = pendingList.reduce(
      (max, p) => (p.discountPercentage > max ? p.discountPercentage : max),
      0
    );

    const todayStr = new Date().toISOString().split('T')[0];
    const pubToday = publishedList.filter(p => p.publishedAt?.startsWith(todayStr)).length;

    const totalDiscountSum = pendingList.reduce((acc, p) => acc + p.discountPercentage, 0);
    const avgDisc = pendingList.length > 0 ? Math.round(totalDiscountSum / pendingList.length) : 0;

    return {
      totalRadar: pendingList.length,
      highestDiscount: maxDiscount,
      publishedToday: pubToday,
      avgDiscount: avgDisc
    };
  }, [products]);

  return {
    products,
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
  };
}
