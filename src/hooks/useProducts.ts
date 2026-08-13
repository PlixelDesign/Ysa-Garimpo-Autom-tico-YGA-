import { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, FilterCategoryType, MetricSummary, ProductStatus } from '../types/product';
import { INITIAL_MOCK_PRODUCTS } from '../data/mockProducts';
import { isSupabaseConfigured, fetchProductsFromSupabase, updateProductStatusInSupabase } from '../services/supabase';
import confetti from 'canvas-confetti';

export interface ToastState {
  id: number;
  show: boolean;
  message: string;
  subtext?: string;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(INITIAL_MOCK_PRODUCTS);
  const [activeTab, setActiveTab] = useState<'radar' | 'history'>('radar');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategoryType>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isUsingSupabase, setIsUsingSupabase] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState>({ id: 0, show: false, message: '' });

  // Tenta carregar dados do Supabase se estiver configurado
  useEffect(() => {
    async function loadSupabaseData() {
      if (isSupabaseConfigured()) {
        setLoading(true);
        const data = await fetchProductsFromSupabase();
        if (data && data.length > 0) {
          setProducts(data);
          setIsUsingSupabase(true);
        }
        setLoading(false);
      }
    }
    loadSupabaseData();
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

  // Copiar Copy + Link para a área de transferência com feedback tátil e confetti
  const copyProductData = useCallback(async (product: Product) => {
    const textToCopy = `${product.copyText}\n\n🛒 Link de Compra: ${product.affiliateLink}`;
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback para navegadores antigos
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      // Efeito festivo sutil de Confetti para dar dopamina/delight na velocidade de uso!
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

    // Atualização otimista da UI
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === productId
          ? { ...p, status: 'published' as ProductStatus, publishedAt: nowIso }
          : p
      )
    );

    showToastNotification(
      'Produto movido para o Histórico!',
      'Status alterado para Publicado com sucesso.'
    );

    // Se houver Supabase conectado, sincroniza em background
    if (isUsingSupabase) {
      await updateProductStatusInSupabase(productId, 'published');
    }
  }, [isUsingSupabase, showToastNotification]);

  // Restaurar produto do Histórico para o Radar
  const restoreToRadar = useCallback(async (productId: string) => {
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === productId
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

  // Atualizar a Copy de um produto (ex: via modal de edição)
  const updateProductCopy = useCallback((productId: string, newCopyText: string) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, copyText: newCopyText } : p))
    );
    showToastNotification('Copy Atualizada!', 'As alterações foram salvas com sucesso.');
  }, [showToastNotification]);

  // Filtragem e Ordenação dos Produtos do RADAR DO DIA
  // Regra de Negócio Inegociável: ORDENAÇÃO SEMPRE POR MAIOR DESCONTO (%)
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
      .sort((a, b) => b.discountPercentage - a.discountPercentage); // Maior desconto no topo!
  }, [products, selectedCategory, searchQuery]);

  // Produtos do HISTÓRICO
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
        return dateB - dateA; // Mais recentes primeiro
      });
  }, [products, selectedCategory, searchQuery]);

  // Cálculo das Métricas resumidas
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
    isUsingSupabase,
    copyProductData,
    markAsPublished,
    restoreToRadar,
    updateProductCopy,
    toast,
    hideToast
  };
}
