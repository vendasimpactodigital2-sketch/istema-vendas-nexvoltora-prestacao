import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Receipt,
  RotateCcw,
  Check,
} from 'lucide-react';
import { formatCurrency, generateId } from '../../lib/utils';

export interface ExtractedExpenseItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  selected: boolean;
}

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpenses: (
    items: Array<{
      description: string;
      quantity: number;
      unit: string;
      unit_price: number;
      total_price: number;
    }>
  ) => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onAddExpenses,
}) => {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>('');
  const [receiptDate, setReceiptDate] = useState<string>('');
  const [items, setItems] = useState<ExtractedExpenseItem[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  if (!isOpen) return null;

  const resetState = () => {
    setImagePreview(null);
    setIsProcessing(false);
    setError(null);
    setStoreName('');
    setReceiptDate('');
    setItems([]);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecione uma imagem válida (JPG, PNG, WEBP).');
      return;
    }

    setError(null);
    setIsProcessing(true);

    // Read image as Data URL for preview and base64 transmission
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);

      try {
        const response = await fetch('/api/extract-receipt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: dataUrl,
            mimeType: file.type || 'image/jpeg',
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao processar notinha.');
        }

        setStoreName(data.store_name || '');
        setReceiptDate(data.receipt_date || '');

        const mappedItems: ExtractedExpenseItem[] = (data.items || []).map((it: any) => ({
          id: generateId('item'),
          description: it.description || 'Item da notinha',
          quantity: Number(it.quantity) || 1,
          unit: it.unit || 'un',
          unit_price: Number(it.unit_price) || 0,
          total_price: Number(it.total_price) || 0,
          selected: true,
        }));

        if (mappedItems.length === 0) {
          setError('Nenhum item discriminado foi identificado na foto. Verifique a nitidez ou adicione manualmente.');
        }

        setItems(mappedItems);
      } catch (err: any) {
        console.error('Falha no scanner de notinha:', err);
        setError(err.message || 'Não foi possível ler a notinha. Tente uma foto mais iluminada e nítida.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setError('Erro ao carregar o arquivo de imagem.');
      setIsProcessing(false);
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const toggleItemSelection = (index: number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index].selected = !updated[index].selected;
      return updated;
    });
  };

  const updateItemField = (index: number, field: keyof ExtractedExpenseItem, val: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const it = { ...updated[index], [field]: val };
      if (field === 'quantity' || field === 'unit_price') {
        const q = field === 'quantity' ? Number(val) : it.quantity;
        const p = field === 'unit_price' ? Number(val) : it.unit_price;
        it.total_price = Math.round((Number(q) || 0) * (Number(p) || 0) * 100) / 100;
      }
      updated[index] = it;
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedItems = items.filter((it) => it.selected);
  const selectedTotal = selectedItems.reduce((acc, it) => acc + (it.total_price || 0), 0);

  const handleConfirmAdd = () => {
    if (selectedItems.length === 0) return;

    onAddExpenses(
      selectedItems.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.unit_price,
        total_price: it.total_price,
      }))
    );

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      {/* Hidden inputs for camera capture and gallery selection */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Escanear Notinha com IA</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  OCR Automático
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Bata foto da notinha ou comprovante para discriminar cada gasto e somar ao cliente.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Step 1: When no image is loaded yet */}
          {!imagePreview && !isProcessing && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all text-center space-y-4 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30'
              }`}
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <Camera className="w-8 h-8" />
              </div>

              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tire uma foto ou anexe o comprovante
                </h4>
                <p className="text-xs text-slate-500">
                  A inteligência artificial vai ler a foto, separar todos os itens com suas quantidades e valores unitários, e somar tudo automaticamente nos gastos do cliente.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Tirar Foto Agora (Câmera)</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Escolher Foto da Galeria</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 pt-2">
                Formatos suportados: fotos de celulares, JPG, PNG ou cupons fiscais.
              </p>
            </div>
          )}

          {/* Step 2: Processing State */}
          {isProcessing && (
            <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Notinha em análise"
                    className="w-full h-full object-cover rounded-2xl opacity-40 shadow-md"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span>Analisando Notinha com Inteligência Artificial...</span>
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Discriminando descrições, quantidades, unidades e valores unitários de cada item para somar no valor do cliente.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Atenção</p>
                <p className="text-[11px] mt-0.5">{error}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="font-bold underline cursor-pointer text-xs"
                  >
                    Tentar outra foto com a câmera
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="font-bold underline cursor-pointer text-xs"
                  >
                    Escolher outro arquivo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Extracted Items list */}
          {!isProcessing && items.length > 0 && (
            <div className="space-y-4">
              {/* Receipt Summary Banner */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-emerald-200 dark:border-emerald-800">
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt="Miniatura da notinha"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-emerald-950 dark:text-emerald-200">
                      {storeName ? `Notinha: ${storeName}` : 'Itens Identificados com Sucesso'}
                    </h5>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      {items.length} {items.length === 1 ? 'item discriminado' : 'itens discriminados'}
                      {receiptDate ? ` • Data: ${receiptDate}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold hover:bg-emerald-50 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Bater outra foto"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Outra Foto</span>
                  </button>
                </div>
              </div>

              {/* Items table / rows */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 px-1">
                  <span>Itens para incluir nos Gastos:</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Marque ou edite antes de inserir
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[38vh] overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border flex flex-col sm:flex-row items-center gap-2 transition-all ${
                        item.selected
                          ? 'border-emerald-300 dark:border-emerald-800/80 bg-white dark:bg-slate-800'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 opacity-60'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleItemSelection(idx)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          item.selected
                            ? 'bg-emerald-600 text-white'
                            : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {item.selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      {/* Description */}
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItemField(idx, 'description', e.target.value)}
                        className="flex-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        placeholder="Descrição do gasto"
                      />

                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        {/* Qtd */}
                        <div className="w-16 shrink-0">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => updateItemField(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs text-center font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                            placeholder="Qtd"
                          />
                        </div>

                        {/* Unit */}
                        <div className="w-16 shrink-0">
                          <select
                            value={item.unit}
                            onChange={(e) => updateItemField(idx, 'unit', e.target.value)}
                            className="w-full px-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          >
                            <option value="un">un</option>
                            <option value="lata">lata</option>
                            <option value="galão">galão</option>
                            <option value="saco">saco</option>
                            <option value="rolo">rolo</option>
                            <option value="m²">m²</option>
                            <option value="kg">kg</option>
                            <option value="litro">litro</option>
                            <option value="dia">dia</option>
                            <option value="viagem">viagem</option>
                            <option value="cx">cx</option>
                            <option value="vb">vb</option>
                          </select>
                        </div>

                        {/* Unit Price */}
                        <div className="w-24 shrink-0">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => updateItemField(idx, 'unit_price', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs text-right font-mono font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                            placeholder="Unit R$"
                          />
                        </div>

                        {/* Total Price */}
                        <div className="w-24 text-right font-mono font-black text-xs text-slate-900 dark:text-white shrink-0">
                          {formatCurrency(item.total_price)}
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Remover este item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            {items.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Total Selecionado:
                </span>
                <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(selectedTotal)}
                </span>
                <span className="text-[11px] text-slate-400">
                  ({selectedItems.length} {selectedItems.length === 1 ? 'item' : 'itens'})
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            {items.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmAdd}
                disabled={selectedItems.length === 0}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Inserir nos Gastos (+ {formatCurrency(selectedTotal)})
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
