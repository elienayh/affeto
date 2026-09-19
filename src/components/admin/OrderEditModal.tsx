import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  Truck,
  Store,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Package,
  AlertCircle,
  Check,
} from 'lucide-react';
import {
  Order,
  OrderItem,
  Product,
  DeliveryZone,
  DeliveryCepRule,
  Coupon,
  DeliveryType,
} from '../../types';
import { calculateOrderPricing } from '../../lib/pricingEngine';

interface OrderEditModalProps {
  order: Order | null;
  onClose: () => void;
  onSave: (updatedOrder: Order, auditNote: string) => Promise<void>;
  availableProducts: Product[];
  availableZones: DeliveryZone[];
  availableCepRules?: DeliveryCepRule[];
  availableCoupons?: Coupon[];
}

export const OrderEditModal: React.FC<OrderEditModalProps> = ({
  order,
  onClose,
  onSave,
  availableProducts,
  availableZones,
  availableCepRules = [],
  availableCoupons = [],
}) => {
  if (!order) return null;

  // Estado dos campos editáveis do cliente
  const [customerName, setCustomerName] = useState(order.customer_name);
  const [customerPhone, setCustomerPhone] = useState(order.customer_phone || '');
  const [customerEmail, setCustomerEmail] = useState(order.customer_email || '');

  // Estado da entrega
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(order.delivery_type);
  const [scheduledDate, setScheduledDate] = useState(order.scheduled_date || '');
  const [scheduledTime, setScheduledTime] = useState(order.scheduled_time || '');
  const [deliveryZoneId, setDeliveryZoneId] = useState(order.delivery_zone_id || '');

  // Endereço
  const [street, setStreet] = useState(order.address?.street || '');
  const [number, setNumber] = useState(order.address?.number || '');
  const [complement, setComplement] = useState(order.address?.complement || '');
  const [neighborhood, setNeighborhood] = useState(order.address?.neighborhood || '');
  const [city, setCity] = useState(order.address?.city || 'Juiz de Fora');
  const [zipCode, setZipCode] = useState(order.address?.zip_code || '');

  // Observações gerais
  const [notes, setNotes] = useState(order.notes || '');

  // Itens do pedido
  const [items, setItems] = useState<OrderItem[]>(() =>
    order.items.map((it) => ({ ...it }))
  );

  // Desconto e Frete
  const [customDiscount, setCustomDiscount] = useState<number>(order.discount || 0);
  const [customDeliveryFee, setCustomDeliveryFee] = useState<number>(order.delivery_fee || 0);

  // Seletor para adicionar novo item
  const [selectedNewProductId, setSelectedNewProductId] = useState<string>('');
  const [selectedNewQty, setSelectedNewQty] = useState<number>(1);

  // Auditoria
  const [auditNote, setAuditNote] = useState('Pedido editado pelo administrador');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Recálculo automático dos valores usando o pricingEngine e dados de itens
  const pricing = useMemo(() => {
    // 1. Tenta recalcular via calculateOrderPricing se houver produtos mapeados
    const pricingInput = {
      items: items.map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        selected_options: it.selected_options?.map((opt) => ({
          option_id: opt.option_id,
          value_id: opt.value_id,
        })),
      })),
      availableProducts,
      delivery_type: deliveryType,
      delivery_zone_id: deliveryZoneId,
      availableZones,
      zip_code: zipCode,
      availableCepRules,
      coupon_code: order.coupon_code,
      availableCoupons,
    };

    const calculated = calculateOrderPricing(pricingInput);

    // Subtotal calculado a partir dos itens
    const itemsSubtotal = items.reduce((acc, it) => acc + (it.unit_price * it.quantity), 0);

    const fee = deliveryType === 'PICKUP' ? 0 : customDeliveryFee;
    const discount = customDiscount;
    const total = Math.max(0, itemsSubtotal - discount + fee);

    return {
      subtotal: itemsSubtotal,
      delivery_fee: fee,
      discount: discount,
      total: total,
    };
  }, [
    items,
    availableProducts,
    deliveryType,
    deliveryZoneId,
    availableZones,
    zipCode,
    availableCepRules,
    order.coupon_code,
    availableCoupons,
    customDeliveryFee,
    customDiscount,
  ]);

  const handleAddItem = () => {
    if (!selectedNewProductId) return;
    const prod = availableProducts.find((p) => p.id === selectedNewProductId);
    if (!prod) return;

    const unitPrice = prod.promotional_price !== null && prod.promotional_price !== undefined
      ? prod.promotional_price
      : prod.base_price;

    const newItem: OrderItem = {
      id: `it-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      order_id: order.id,
      product_id: prod.id,
      product_name: prod.name,
      quantity: selectedNewQty,
      unit_price: unitPrice,
      subtotal: unitPrice * selectedNewQty,
      notes: '',
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedNewProductId('');
    setSelectedNewQty(1);
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx === index) {
          return {
            ...it,
            quantity: newQty,
            subtotal: it.unit_price * newQty,
          };
        }
        return it;
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setErrorMsg('O pedido deve conter pelo menos 1 item.');
      return;
    }
    setErrorMsg(null);
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemNoteChange = (index: number, note: string) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, notes: note } : it))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setErrorMsg('O pedido não pode ficar sem itens.');
      return;
    }
    if (!customerName.trim()) {
      setErrorMsg('O nome do cliente é obrigatório.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const updatedOrder: Order = {
        ...order,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || null,
        delivery_type: deliveryType,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        delivery_zone_id: deliveryType === 'DELIVERY' ? deliveryZoneId : undefined,
        address:
          deliveryType === 'DELIVERY'
            ? {
                id: order.address?.id || `addr-${Date.now()}`,
                street: street.trim(),
                number: number.trim(),
                complement: complement.trim(),
                neighborhood: neighborhood.trim(),
                city: city.trim(),
                zip_code: zipCode.trim(),
              }
            : null,
        items: items.map((it) => ({
          ...it,
          subtotal: it.unit_price * it.quantity,
        })),
        notes: notes.trim(),
        subtotal: pricing.subtotal,
        discount: pricing.discount,
        delivery_fee: pricing.delivery_fee,
        total: pricing.total,
        updated_at: new Date().toISOString(),
      };

      await onSave(
        updatedOrder,
        auditNote.trim() || 'Pedido editado pelo administrador: dados e itens atualizados'
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao salvar alterações do pedido.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white border border-[#3A2E1F]/15 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-auto max-h-[94vh] overflow-y-auto">
        {/* CABEÇALHO */}
        <div className="flex items-start justify-between border-b border-[#3A2E1F]/10 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B8623F]">
              Edição Completa
            </span>
            <h2 className="font-serif font-bold text-2xl text-[#3A2E1F]">
              Editar Pedido {order.code}
            </h2>
            <p className="text-xs text-[#7E6C58]">
              Altere dados do cliente, itens, entrega e observações com recálculo automático.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 text-[#7E6C58] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* 1. DADOS DO CLIENTE */}
          <div className="bg-[#FAF7F0] p-4 rounded-2xl border border-[#3A2E1F]/10 space-y-3">
            <h3 className="font-bold text-[#3A2E1F] uppercase text-xs">1. Dados do Cliente</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-[#554432] block mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl px-3 py-2 text-xs text-[#3A2E1F] focus:outline-none focus:border-[#B8623F]"
                />
              </div>
              <div>
                <label className="font-semibold text-[#554432] block mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl px-3 py-2 text-xs text-[#3A2E1F] focus:outline-none focus:border-[#B8623F]"
                />
              </div>
              <div>
                <label className="font-semibold text-[#554432] block mb-1">E-mail</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl px-3 py-2 text-xs text-[#3A2E1F] focus:outline-none focus:border-[#B8623F]"
                />
              </div>
            </div>
          </div>

          {/* 2. ENTREGA & AGENDAMENTO */}
          <div className="bg-[#FAF7F0] p-4 rounded-2xl border border-[#3A2E1F]/10 space-y-3">
            <h3 className="font-bold text-[#3A2E1F] uppercase text-xs">2. Entrega e Data Agendada</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-[#554432] block mb-1">Tipo de Atendimento</label>
                <select
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
                  className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl px-3 py-2 text-xs text-[#3A2E1F] font-semibold focus:outline-none focus:border-[#B8623F]"
                >
                  <option value="DELIVERY">🚚 Entrega em Domicílio</option>
                  <option value="PICKUP">🏬 Retirada no Balcão</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-[#554432] block mb-1">Data Prevista *</label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl px-3 py-2 text-xs text-[#3A2E1F] focus:outline-none focus:border-[#B8623F]"
                />
              </div>
              <div>
                <label className="font-semibold text-[#554432] block mb-1">Janela de Horário</label>
                <input
                  type="text"
                  placeholder="Ex: 14:00 - 18:00"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl px-3 py-2 text-xs text-[#3A2E1F] focus:outline-none focus:border-[#B8623F]"
                />
              </div>
            </div>

            {/* Campos de endereço caso seja Entrega */}
            {deliveryType === 'DELIVERY' && (
              <div className="pt-2 border-t border-[#3A2E1F]/10 space-y-2">
                <span className="text-[11px] font-bold text-[#7E6C58] block">Endereço de Entrega:</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Rua / Avenida"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Número"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Complemento / Apto"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Bairro"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="CEP"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. ITENS DO PEDIDO (EDIÇÃO, ADIÇÃO E REMOÇÃO) */}
          <div className="bg-white p-4 rounded-2xl border border-[#3A2E1F]/15 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-[#3A2E1F] uppercase text-xs">
                3. Itens do Pedido ({items.length})
              </h3>
              <span className="text-[11px] text-[#7E6C58]">Recálculo automático em tempo real</span>
            </div>

            {/* Lista de Itens Existentes */}
            <div className="divide-y divide-stone-100 border border-[#3A2E1F]/10 rounded-xl overflow-hidden">
              {items.map((it, idx) => (
                <div key={it.id || idx} className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <span className="font-bold text-sm text-[#3A2E1F] block">{it.product_name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-[#7E6C58]">
                        R$ {it.unit_price.toFixed(2)} un.
                      </span>
                      <input
                        type="text"
                        placeholder="Observação do item (opcional)..."
                        value={it.notes || ''}
                        onChange={(e) => handleItemNoteChange(idx, e.target.value)}
                        className="bg-[#FAF7F0] border border-[#3A2E1F]/10 rounded-lg px-2 py-0.5 text-[11px] text-[#3A2E1F] flex-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Controle de quantidade */}
                    <div className="flex items-center border border-[#3A2E1F]/15 rounded-xl overflow-hidden bg-[#FAF7F0]">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, it.quantity - 1)}
                        className="px-2.5 py-1 text-sm font-bold text-[#7E6C58] hover:bg-stone-200 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 font-bold text-xs text-[#3A2E1F]">
                        {it.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, it.quantity + 1)}
                        className="px-2.5 py-1 text-sm font-bold text-[#7E6C58] hover:bg-stone-200 cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <div className="font-bold text-sm text-[#3A2E1F] min-w-[70px] text-right">
                      R$ {(it.unit_price * it.quantity).toFixed(2)}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Remover item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Adicionar Novo Item */}
            <div className="p-3 bg-[#FAF7F0] border border-[#3A2E1F]/10 rounded-xl flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <select
                value={selectedNewProductId}
                onChange={(e) => setSelectedNewProductId(e.target.value)}
                className="flex-1 bg-white border border-[#3A2E1F]/15 rounded-xl px-3 py-2 text-xs text-[#3A2E1F] font-medium focus:outline-none focus:border-[#B8623F]"
              >
                <option value="">+ Selecione um produto para adicionar...</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — R$ {p.promotional_price || p.base_price}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={selectedNewQty}
                  onChange={(e) => setSelectedNewQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-white border border-[#3A2E1F]/15 rounded-xl px-2 py-2 text-xs text-center font-bold"
                />
                <button
                  type="button"
                  disabled={!selectedNewProductId}
                  onClick={handleAddItem}
                  className="px-4 py-2 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. OBSERVAÇÕES GERAIS */}
          <div className="bg-[#FAF7F0] p-4 rounded-2xl border border-[#3A2E1F]/10 space-y-2">
            <label className="font-bold text-[#3A2E1F] uppercase text-xs block">
              4. Observações do Pedido
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Entregar na portaria. Não tocar a campainha..."
              className="w-full bg-white border border-[#3A2E1F]/15 rounded-xl p-3 text-xs text-[#3A2E1F] focus:outline-none focus:border-[#B8623F]"
            />
          </div>

          {/* 5. TOTAIS E RECÁLCULO */}
          <div className="bg-[#FAF7F0] p-4 rounded-2xl border border-[#3A2E1F]/10 space-y-2">
            <h3 className="font-bold text-[#3A2E1F] uppercase text-xs">5. Totais Recalculados</h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-[#3A2E1F]/10">
              <div>
                <span className="text-[10px] text-[#7E6C58] uppercase font-bold block">Subtotal</span>
                <span className="font-bold text-sm text-[#3A2E1F]">
                  R$ {pricing.subtotal.toFixed(2)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-[#7E6C58] uppercase font-bold block">Taxa de Entrega</span>
                {deliveryType === 'DELIVERY' ? (
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={customDeliveryFee}
                    onChange={(e) => setCustomDeliveryFee(parseFloat(e.target.value) || 0)}
                    className="w-24 bg-[#FAF7F0] border border-[#3A2E1F]/15 rounded-lg px-2 py-0.5 font-bold text-xs"
                  />
                ) : (
                  <span className="font-bold text-sm text-[#3A2E1F]">Grátis</span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-[#7E6C58] uppercase font-bold block">Desconto (R$)</span>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={customDiscount}
                  onChange={(e) => setCustomDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 bg-[#FAF7F0] border border-[#3A2E1F]/15 rounded-lg px-2 py-0.5 font-bold text-xs"
                />
              </div>

              <div>
                <span className="text-[10px] text-[#B8623F] uppercase font-black block">Total Final</span>
                <span className="font-serif font-black text-base text-[#B8623F]">
                  R$ {pricing.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 6. MOTIVO DA AUDITORIA */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#7E6C58] uppercase block">
              Registro no Histórico (Auditoria)
            </label>
            <input
              type="text"
              value={auditNote}
              onChange={(e) => setAuditNote(e.target.value)}
              className="w-full bg-[#FAF7F0] border border-[#3A2E1F]/15 rounded-xl px-3 py-2 text-xs text-[#3A2E1F]"
            />
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3A2E1F]/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#3A2E1F] rounded-xl font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações do Pedido'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
