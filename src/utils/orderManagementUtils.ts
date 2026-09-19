import { Order, OrderStatus, PaymentMethod, PaymentStatus } from '../types';

export type OperationalStage =
  | 'AGUARDANDO_PREPARO'
  | 'EM_PREPARO'
  | 'PRONTO'
  | 'EM_ROTA'
  | 'ENTREGUE'
  | 'CANCELADO';

export interface OrderFilterState {
  search: string;
  operationalStage: OperationalStage | 'TODOS';
  paymentStatus: 'TODOS' | 'PENDING' | 'APPROVED' | 'CASH_ON_DELIVERY' | 'CANCELLED' | 'REFUNDED';
  dateFilter: 'TODOS' | 'HOJE' | 'AMANHA' | 'PROXIMOS_7_DIAS' | 'PROXIMA_SEMANA' | 'ESTE_MES' | 'CUSTOM';
  customDateStart?: string;
  customDateEnd?: string;
  deliveryType: 'TODOS' | 'DELIVERY' | 'PICKUP';
  location: string;
  customerName: string;
  productId: string;
}

export type OrderSortOption =
  | 'DELIVERY_DATE_ASC'
  | 'DELIVERY_DATE_DESC'
  | 'ORDER_DATE_DESC'
  | 'ORDER_DATE_ASC'
  | 'TOTAL_DESC'
  | 'OPERATIONAL_PRIORITY';

/**
 * Mapeia o status do pedido para o estágio operacional
 */
export function getOperationalStage(order: Order): OperationalStage {
  if (order.status === 'CANCELLED') return 'CANCELADO';
  if (order.status === 'PREPARING') return 'EM_PREPARO';
  if (order.status === 'READY') return 'PRONTO';
  if (order.status === 'OUT_FOR_DELIVERY') return 'EM_ROTA';
  if (order.status === 'DELIVERED' || order.status === 'PICKED_UP') return 'ENTREGUE';
  return 'AGUARDANDO_PREPARO'; // PENDING_PAYMENT e CONFIRMED
}

export function getOperationalStageLabel(stage: OperationalStage): string {
  switch (stage) {
    case 'AGUARDANDO_PREPARO':
      return 'Aguardando Preparo';
    case 'EM_PREPARO':
      return 'Em Preparo';
    case 'PRONTO':
      return 'Pronto';
    case 'EM_ROTA':
      return 'Em Rota';
    case 'ENTREGUE':
      return 'Entregue';
    case 'CANCELADO':
      return 'Cancelado';
  }
}

export function getOperationalStageBadge(stage: OperationalStage) {
  switch (stage) {
    case 'AGUARDANDO_PREPARO':
      return {
        label: 'Aguardando Preparo',
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'EM_PREPARO':
      return {
        label: 'Em Preparo',
        bg: 'bg-orange-50',
        text: 'text-orange-800',
        border: 'border-orange-200',
        dot: 'bg-orange-500',
      };
    case 'PRONTO':
      return {
        label: 'Pronto',
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'EM_ROTA':
      return {
        label: 'Em Rota',
        bg: 'bg-purple-50',
        text: 'text-purple-800',
        border: 'border-purple-200',
        dot: 'bg-purple-500',
      };
    case 'ENTREGUE':
      return {
        label: 'Entregue',
        bg: 'bg-stone-100',
        text: 'text-stone-700',
        border: 'border-stone-200',
        dot: 'bg-stone-500',
      };
    case 'CANCELADO':
      return {
        label: 'Cancelado',
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
      };
  }
}

/**
 * Informações visuais e semânticas do pagamento (totalmente desvinculado da operação)
 */
export function getPaymentInfo(order: Order) {
  const isCod =
    order.payment_method === 'CASH_ON_DELIVERY' ||
    order.payment?.method === 'CASH_ON_DELIVERY';

  if (order.payment_status === 'APPROVED') {
    return {
      label: isCod ? 'Pago na Entrega' : 'Pago',
      sublabel: order.payment_method ? formatPaymentMethod(order.payment_method) : 'Aprovado',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      isPaid: true,
      isCod,
      isPending: false,
    };
  }

  if (order.payment_status === 'CANCELLED') {
    return {
      label: 'Cancelado',
      sublabel: 'Pagamento cancelado',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      isPaid: false,
      isCod,
      isPending: false,
    };
  }

  if (order.payment_status === 'REFUNDED') {
    return {
      label: 'Estornado',
      sublabel: 'Reembolsado ao cliente',
      bg: 'bg-stone-100',
      text: 'text-stone-700',
      border: 'border-stone-200',
      badgeClass: 'bg-stone-200 text-stone-800 border-stone-300',
      isPaid: false,
      isCod,
      isPending: false,
    };
  }

  if (isCod) {
    return {
      label: 'Pagamento na Entrega',
      sublabel: 'A receber no ato',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
      isPaid: false,
      isCod: true,
      isPending: true,
    };
  }

  return {
    label: 'Pendente',
    sublabel: 'Aguardando pagamento',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    isPaid: false,
    isCod: false,
    isPending: true,
  };
}

export function formatPaymentMethod(method?: PaymentMethod | string): string {
  switch (method) {
    case 'PIX':
      return 'PIX';
    case 'CREDIT_CARD':
      return 'Cartão de Crédito';
    case 'DEBIT_CARD':
      return 'Cartão de Débito';
    case 'CASH_ON_DELIVERY':
      return 'Pagamento na Entrega';
    default:
      return method || 'Não especificado';
  }
}

/**
 * Calcula a proximidade da data de entrega e gera texto e destaque visual obrigatório
 */
export function getDeliveryDateHighlight(scheduledDate?: string, scheduledTime?: string) {
  if (!scheduledDate) {
    return {
      tag: 'NÃO AGENDADO',
      fullText: 'Data a combinar',
      timeText: scheduledTime || '',
      badgeClass: 'bg-stone-100 text-stone-600 border border-stone-200',
      urgency: 'none',
      diffDays: 999,
      formattedDate: '--/--',
    };
  }

  // Normaliza datas para meia-noite
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let targetDate: Date;
  if (scheduledDate.includes('-')) {
    const [y, m, d] = scheduledDate.split('-').map(Number);
    targetDate = new Date(y, m - 1, d);
  } else {
    targetDate = new Date(scheduledDate);
  }
  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();

  const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

  const dayStr = String(targetDate.getDate()).padStart(2, '0');
  const monthStr = String(targetDate.getMonth() + 1).padStart(2, '0');
  const formattedDate = `${dayStr}/${monthStr}`;

  if (diffDays < 0) {
    return {
      tag: 'DATA PASSADA',
      fullText: `PASSOU — ${formattedDate}`,
      timeText: scheduledTime || '',
      badgeClass: 'bg-rose-600 text-white font-bold shadow-xs',
      urgency: 'critical',
      diffDays,
      formattedDate,
    };
  }

  if (diffDays === 0) {
    return {
      tag: 'HOJE',
      fullText: `HOJE — ${formattedDate}`,
      timeText: scheduledTime || '',
      badgeClass: 'bg-[#B8623F] text-white font-extrabold shadow-sm ring-2 ring-[#B8623F]/30',
      urgency: 'high',
      diffDays,
      formattedDate,
    };
  }

  if (diffDays === 1) {
    return {
      tag: 'AMANHÃ',
      fullText: `AMANHÃ — ${formattedDate}`,
      timeText: scheduledTime || '',
      badgeClass: 'bg-amber-600 text-white font-extrabold shadow-sm ring-2 ring-amber-400/40',
      urgency: 'high',
      diffDays,
      formattedDate,
    };
  }

  if (diffDays === 2) {
    return {
      tag: 'EM 2 DIAS',
      fullText: `EM 2 DIAS — ${formattedDate}`,
      timeText: scheduledTime || '',
      badgeClass: 'bg-blue-600 text-white font-bold',
      urgency: 'medium',
      diffDays,
      formattedDate,
    };
  }

  if (diffDays === 3) {
    return {
      tag: 'EM 3 DIAS',
      fullText: `EM 3 DIAS — ${formattedDate}`,
      timeText: scheduledTime || '',
      badgeClass: 'bg-blue-500 text-white font-bold',
      urgency: 'medium',
      diffDays,
      formattedDate,
    };
  }

  if (diffDays >= 4 && diffDays <= 7) {
    return {
      tag: 'PRÓXIMA SEMANA',
      fullText: `PRÓXIMA SEMANA — ${formattedDate}`,
      timeText: scheduledTime || '',
      badgeClass: 'bg-stone-700 text-white font-medium',
      urgency: 'normal',
      diffDays,
      formattedDate,
    };
  }

  return {
    tag: 'ENTREGA FUTURA',
    fullText: `FUTURA — ${formattedDate}`,
    timeText: scheduledTime || '',
    badgeClass: 'bg-stone-200 text-stone-700 font-medium',
    urgency: 'low',
    diffDays,
    formattedDate,
  };
}

/**
 * Próxima ação operacional recomendada (botão único por estágio)
 */
export function getNextOperationalAction(order: Order): {
  nextStatus: OrderStatus;
  label: string;
  auditNote: string;
  btnClass: string;
} | null {
  const stage = getOperationalStage(order);

  switch (stage) {
    case 'AGUARDANDO_PREPARO':
      return {
        nextStatus: 'PREPARING',
        label: 'Iniciar Preparo',
        auditNote: 'Iniciado o processo de fermentação e forno',
        btnClass: 'bg-[#B8623F] hover:bg-[#994E30] text-white',
      };
    case 'EM_PREPARO':
      return {
        nextStatus: 'READY',
        label: 'Marcar como Pronto',
        auditNote: 'Pães assados, resfriados e embalados com carinho',
        btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      };
    case 'PRONTO':
      if (order.delivery_type === 'DELIVERY') {
        return {
          nextStatus: 'OUT_FOR_DELIVERY',
          label: 'Colocar em Rota',
          auditNote: 'Pedido despachado para entrega com o motorista',
          btnClass: 'bg-purple-600 hover:bg-purple-700 text-white',
        };
      } else {
        return {
          nextStatus: 'PICKED_UP',
          label: 'Concluir Retirada',
          auditNote: 'Cliente retirou o pedido no balcão',
          btnClass: 'bg-stone-800 hover:bg-stone-900 text-white',
        };
      }
    case 'EM_ROTA':
      return {
        nextStatus: 'DELIVERED',
        label: 'Finalizar Entrega',
        auditNote: 'Pedido entregue com sucesso ao cliente',
        btnClass: 'bg-stone-800 hover:bg-stone-900 text-white',
      };
    default:
      return null;
  }
}

/**
 * Filtragem combinável robusta
 */
export function filterOrders(orders: Order[], filters: OrderFilterState): Order[] {
  return orders.filter((order) => {
    // 1. Busca textual
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const codeMatch = order.code?.toLowerCase().includes(q);
      const customerMatch = order.customer_name?.toLowerCase().includes(q);
      const phoneMatch = order.customer_phone?.toLowerCase().includes(q);
      const emailMatch = order.customer_email?.toLowerCase().includes(q);
      const streetMatch = order.address?.street?.toLowerCase().includes(q);
      const neighborhoodMatch = order.address?.neighborhood?.toLowerCase().includes(q);
      const cityMatch = order.address?.city?.toLowerCase().includes(q);
      const zipMatch = order.address?.zip_code?.replace(/\D/g, '').includes(q.replace(/\D/g, ''));
      const notesMatch = order.notes?.toLowerCase().includes(q);
      const itemMatch = order.items?.some(
        (it) => it.product_name?.toLowerCase().includes(q) || it.notes?.toLowerCase().includes(q)
      );

      if (
        !codeMatch &&
        !customerMatch &&
        !phoneMatch &&
        !emailMatch &&
        !streetMatch &&
        !neighborhoodMatch &&
        !cityMatch &&
        !zipMatch &&
        !notesMatch &&
        !itemMatch
      ) {
        return false;
      }
    }

    // 2. Estágio Operacional
    if (filters.operationalStage !== 'TODOS') {
      const stage = getOperationalStage(order);
      if (stage !== filters.operationalStage) return false;
    }

    // 3. Pagamento
    if (filters.paymentStatus !== 'TODOS') {
      const isCod =
        order.payment_method === 'CASH_ON_DELIVERY' ||
        order.payment?.method === 'CASH_ON_DELIVERY';

      if (filters.paymentStatus === 'CASH_ON_DELIVERY') {
        if (!isCod) return false;
      } else if (filters.paymentStatus === 'PENDING') {
        if (order.payment_status !== 'PENDING' || isCod) return false;
      } else if (filters.paymentStatus === 'APPROVED') {
        if (order.payment_status !== 'APPROVED') return false;
      } else if (filters.paymentStatus === 'CANCELLED') {
        if (order.payment_status !== 'CANCELLED') return false;
      } else if (filters.paymentStatus === 'REFUNDED') {
        if (order.payment_status !== 'REFUNDED') return false;
      }
    }

    // 4. Data de Entrega
    if (filters.dateFilter !== 'TODOS') {
      const { diffDays } = getDeliveryDateHighlight(order.scheduled_date, order.scheduled_time);

      if (filters.dateFilter === 'HOJE') {
        if (diffDays !== 0) return false;
      } else if (filters.dateFilter === 'AMANHA') {
        if (diffDays !== 1) return false;
      } else if (filters.dateFilter === 'PROXIMOS_7_DIAS') {
        if (diffDays < 0 || diffDays > 7) return false;
      } else if (filters.dateFilter === 'PROXIMA_SEMANA') {
        if (diffDays < 7 || diffDays > 14) return false;
      } else if (filters.dateFilter === 'ESTE_MES') {
        if (!order.scheduled_date) return false;
        const now = new Date();
        const d = new Date(order.scheduled_date);
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (filters.dateFilter === 'CUSTOM') {
        if (!order.scheduled_date) return false;
        if (filters.customDateStart && order.scheduled_date < filters.customDateStart) return false;
        if (filters.customDateEnd && order.scheduled_date > filters.customDateEnd) return false;
      }
    }

    // 5. Tipo de Entrega
    if (filters.deliveryType !== 'TODOS') {
      if (order.delivery_type !== filters.deliveryType) return false;
    }

    // 6. Localização
    if (filters.location && filters.location !== 'TODOS') {
      const loc = filters.location.toLowerCase();
      const addr = order.address;
      const matches =
        addr?.neighborhood?.toLowerCase().includes(loc) ||
        addr?.city?.toLowerCase().includes(loc) ||
        order.delivery_zone_id?.toLowerCase().includes(loc);
      if (!matches) return false;
    }

    // 7. Cliente
    if (filters.customerName && filters.customerName !== 'TODOS') {
      if (order.customer_name?.toLowerCase() !== filters.customerName.toLowerCase()) {
        return false;
      }
    }

    // 8. Produto
    if (filters.productId && filters.productId !== 'TODOS') {
      const hasProduct = order.items?.some(
        (it) => it.product_id === filters.productId || it.product_name === filters.productId
      );
      if (!hasProduct) return false;
    }

    return true;
  });
}

/**
 * Ordenação de pedidos
 */
export function sortOrders(orders: Order[], sortOption: OrderSortOption): Order[] {
  const stagePriority: Record<OperationalStage, number> = {
    AGUARDANDO_PREPARO: 1,
    EM_PREPARO: 2,
    PRONTO: 3,
    EM_ROTA: 4,
    ENTREGUE: 5,
    CANCELADO: 6,
  };

  return [...orders].sort((a, b) => {
    if (sortOption === 'DELIVERY_DATE_ASC') {
      // 1. Data de entrega mais próxima primeiro
      const dateA = a.scheduled_date || '9999-99-99';
      const dateB = b.scheduled_date || '9999-99-99';
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      // 2. Horário de entrega
      const timeA = a.scheduled_time || '99:99';
      const timeB = b.scheduled_time || '99:99';
      if (timeA !== timeB) return timeA.localeCompare(timeB);

      // 3. Prioridade operacional
      return stagePriority[getOperationalStage(a)] - stagePriority[getOperationalStage(b)];
    }

    if (sortOption === 'DELIVERY_DATE_DESC') {
      const dateA = a.scheduled_date || '';
      const dateB = b.scheduled_date || '';
      return dateB.localeCompare(dateA);
    }

    if (sortOption === 'ORDER_DATE_DESC') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }

    if (sortOption === 'ORDER_DATE_ASC') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }

    if (sortOption === 'TOTAL_DESC') {
      return b.total - a.total;
    }

    if (sortOption === 'OPERATIONAL_PRIORITY') {
      return stagePriority[getOperationalStage(a)] - stagePriority[getOperationalStage(b)];
    }

    return 0;
  });
}
