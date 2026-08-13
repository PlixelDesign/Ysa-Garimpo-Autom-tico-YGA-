import React, { useState, useEffect } from 'react';
import { Product } from '../types/product';
import { X, Save, Copy, Check } from 'lucide-react';

interface QuickEditModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: (productId: string, newCopyText: string) => void;
  onCopy: (product: Product) => Promise<boolean>;
}

export const QuickEditModal: React.FC<QuickEditModalProps> = ({
  product,
  onClose,
  onSave,
  onCopy
}) => {
  const [editedCopy, setEditedCopy] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (product) {
      setEditedCopy(product.copyText);
    }
  }, [product]);

  if (!product) return null;

  const handleSave = () => {
    onSave(product.id, editedCopy);
    onClose();
  };

  const handleCopyNow = async () => {
    const updatedProduct = { ...product, copyText: editedCopy };
    const success = await onCopy(updatedProduct);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 relative flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <img
              src={product.imageUrl}
              alt={product.title}
              className="h-10 w-10 object-contain rounded-lg bg-slate-100 p-1 border border-slate-200"
            />
            <div>
              <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                Ajustar Copy do Produto
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {product.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal - Área de Edição */}
        <div className="py-4 flex-1 overflow-y-auto">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Texto Persuasivo de Vendas (Instagram / Telegram):
          </label>
          <textarea
            value={editedCopy}
            onChange={(e) => setEditedCopy(e.target.value)}
            rows={10}
            className="w-full p-3.5 bg-slate-900 text-amber-300 font-mono text-xs rounded-xl border border-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none leading-relaxed"
            placeholder="Digite ou ajuste o texto da copy..."
          />
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
            <span>Link de Afiliado incluído automaticamente ao copiar.</span>
            <span>{editedCopy.length} caracteres</span>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={handleCopyNow}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-500/30'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar Copy Ajustada'}
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            Salvar Alterações
          </button>
        </div>

      </div>
    </div>
  );
};
