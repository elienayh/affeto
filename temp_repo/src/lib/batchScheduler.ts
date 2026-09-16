import { Order, ProductionBatch, ProductionBatchStatus, Product, ProductScheduleConfig } from '../types';

export interface BatchAvailability {
  dateString: string; // YYYY-MM-DD
  formattedDate: string; // Ex: "Sexta-feira, 18/09"
  shortDate: string; // Ex: "Sex, 18/09"
  weekdayName: string; // Ex: "Sexta-feira"
  capacity: number;
  bookedCount: number;
  remainingSlots: number;
  isFull: boolean;
  deliveryWindow: string; // Ex: "14:00 - 18:00"
  batchStatus?: ProductionBatchStatus;
  batchId?: string;
}

export interface ProductBatchDisplayInfo {
  isScheduled: boolean;
  productionDaysLabel: string; // Ex: "terças e sextas"
  deliveryWindow: string;
  earliestBatch: BatchAvailability | null;
  nextAvailableBatch: BatchAvailability | null;
  isFirstBatchFull: boolean;
  firstBatchNotice: string | null; // Ex: "Fornada de sexta esgotada"
  nextDeliveryDateLabel: string | null; // Ex: "Terça-feira, 22/09"
  availabilityText: string; // Ex: "8 de 10 unidades" ou "Esgotado"
}

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const WEEKDAY_PLURALS = [
  'domingos',
  'segundas',
  'terças',
  'quartas',
  'quintas',
  'sextas',
  'sábados',
];

/**
 * Retorna a configuração de fornada e entrega de um produto cadastrada pelo admin.
 * Caso ainda não tenha sido customizada, aplica o calendário padrão artesanal da padaria (Segunda a Sábado).
 */
export function getProductEffectiveScheduleConfig(product: Product): ProductScheduleConfig {
  if (
    product.schedule_config &&
    product.schedule_config.available_days &&
    product.schedule_config.available_days.length > 0
  ) {
    return {
      is_scheduled_only: true,
      available_days: product.schedule_config.available_days,
      batch_limit: product.schedule_config.batch_limit || 15,
      days_label:
        product.schedule_config.days_label ||
        formatDaysLabel(product.schedule_config.available_days),
      min_lead_days: product.schedule_config.min_lead_days ?? 1,
      delivery_window: product.schedule_config.delivery_window || '14:00 - 18:00',
    };
  }

  // Padrão artesanal para produtos sem dias restritos: fornadas de Segunda a Sábado
  return {
    is_scheduled_only: true,
    available_days: [1, 2, 3, 4, 5, 6],
    batch_limit: 20,
    days_label: 'Fornadas de Segunda a Sábado',
    min_lead_days: 1,
    delivery_window: '14:00 - 18:00',
  };
}

/**
 * Formata lista de dias da semana em texto legível (ex: [2, 5] -> "terças e sextas")
 */
export function formatDaysLabel(availableDays: number[] = []): string {
  if (!availableDays || availableDays.length === 0) return 'Todos os dias';
  const names = availableDays.map((d) => WEEKDAY_PLURALS[d] || WEEKDAY_NAMES[d]);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

/**
 * Conta quantas unidades de um produto foram agendadas/reservadas para uma data específica.
 * Considera tanto pedidos novos estruturados com order.deliveries quanto pedidos legados com order.scheduled_date.
 * Desconsidera pedidos com status CANCELLED.
 */
export function getProductBookedQuantityForDate(
  productId: string,
  targetDate: string,
  orders: Order[] = []
): number {
  let booked = 0;

  for (const order of orders) {
    if (order.status === 'CANCELLED') continue;

    // Se o pedido possui entregas particionadas por data
    if (order.deliveries && order.deliveries.length > 0) {
      for (const delivery of order.deliveries) {
        if (delivery.delivery_date === targetDate && delivery.delivery_status !== 'CANCELLED') {
          if (delivery.items && delivery.items.length > 0) {
            for (const item of delivery.items) {
              if (item.product_id === productId) {
                booked += item.quantity;
              }
            }
          }
        }
      }
      continue;
    }

    // Pedido legado: usa scheduled_date único
    if (order.scheduled_date === targetDate) {
      for (const item of order.items || []) {
        if (item.product_id === productId) {
          booked += item.quantity;
        }
      }
    }
  }

  return booked;
}

/**
 * Obtém a capacidade configurada e status de uma fornada para um produto e data.
 * Se houver um registro em production_batches, usa a capacidade customizada.
 * Senão, usa a capacidade padrão de product.schedule_config.batch_limit.
 */
export function getBatchCapacityForDate(
  product: Product,
  targetDate: string,
  batches: ProductionBatch[] = []
): { capacity: number; status: ProductionBatchStatus; batchId?: string } {
  const customBatch = batches.find(
    (b) => b.product_id === product.id && b.production_date === targetDate
  );

  if (customBatch) {
    return {
      capacity: customBatch.capacity,
      status: customBatch.status,
      batchId: customBatch.id,
    };
  }

  const schedule = getProductEffectiveScheduleConfig(product);
  return {
    capacity: schedule.batch_limit || 15,
    status: 'PLANNED',
  };
}

/**
 * Encontra a próxima data de fornada disponível para um produto que comporte a quantidade solicitada integralmente.
 *
 * REGRAS CRÍTICAS:
 * 1. Uma mesma linha de produto deve ficar integralmente em uma única fornada (não dividir).
 * 2. Se a primeira fornada estiver cheia ou não comportar a quantidade, avança para a próxima data disponível.
 * 3. Respeita a antecedência mínima (min_lead_days, padrão 1 dia).
 */
export function getNextAvailableBatch(
  product: Product,
  orders: Order[] = [],
  fromDate: Date = new Date(),
  requestedQuantity = 1,
  batches: ProductionBatch[] = []
): BatchAvailability | null {
  const schedule = getProductEffectiveScheduleConfig(product);
  const { available_days } = schedule;
  if (!available_days || available_days.length === 0) {
    return null;
  }

  const minLeadDays = schedule.min_lead_days ?? 1;
  const deliveryWindow = schedule.delivery_window || '14:00 - 18:00';

  // Inicia a busca a partir da data de corte respeitando antecedência mínima
  const current = new Date(fromDate);
  current.setDate(current.getDate() + minLeadDays);

  // Procura pelos próximos 60 dias a primeira fornada com capacidade suficiente para requestedQuantity
  for (let i = 0; i < 60; i++) {
    const dayOfWeek = current.getDay();

    if (available_days.includes(dayOfWeek)) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;

      const { capacity, status, batchId } = getBatchCapacityForDate(product, dateString, batches);

      // Fornadas canceladas não recebem novos pedidos
      if (status !== 'CANCELLED') {
        const bookedCount = getProductBookedQuantityForDate(product.id, dateString, orders);
        const remainingSlots = Math.max(0, capacity - bookedCount);

        // Regra: comporta a quantidade solicitada integralmente
        if (remainingSlots >= requestedQuantity) {
          const weekdayName = WEEKDAY_NAMES[dayOfWeek];
          const shortDay = WEEKDAY_SHORT[dayOfWeek];

          return {
            dateString,
            formattedDate: `${weekdayName}, ${dd}/${mm}`,
            shortDate: `${shortDay}, ${dd}/${mm}`,
            weekdayName,
            capacity,
            bookedCount,
            remainingSlots,
            isFull: false,
            deliveryWindow,
            batchStatus: status,
            batchId,
          };
        }
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return null;
}

/**
 * Retorna as próximas N fornadas no calendário para o produto.
 * Útil para o cliente escolher uma fornada futura no carrinho ou modal de compra.
 */
export function getUpcomingBatches(
  product: Product,
  orders: Order[] = [],
  limitCount = 6,
  fromDate: Date = new Date(),
  requestedQuantity = 1,
  batches: ProductionBatch[] = []
): BatchAvailability[] {
  const schedule = getProductEffectiveScheduleConfig(product);
  const { available_days } = schedule;
  if (!available_days || available_days.length === 0) {
    return [];
  }

  const minLeadDays = schedule.min_lead_days ?? 1;
  const deliveryWindow = schedule.delivery_window || '14:00 - 18:00';
  const list: BatchAvailability[] = [];

  const current = new Date(fromDate);
  current.setDate(current.getDate() + minLeadDays);

  for (let i = 0; i < 90 && list.length < limitCount; i++) {
    const dayOfWeek = current.getDay();

    if (available_days.includes(dayOfWeek)) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;

      const { capacity, status, batchId } = getBatchCapacityForDate(product, dateString, batches);
      const bookedCount = getProductBookedQuantityForDate(product.id, dateString, orders);
      const remainingSlots = Math.max(0, capacity - bookedCount);
      const isFull = status === 'CANCELLED' || remainingSlots < requestedQuantity;

      list.push({
        dateString,
        formattedDate: `${WEEKDAY_NAMES[dayOfWeek]}, ${dd}/${mm}`,
        shortDate: `${WEEKDAY_SHORT[dayOfWeek]}, ${dd}/${mm}`,
        weekdayName: WEEKDAY_NAMES[dayOfWeek],
        capacity,
        bookedCount,
        remainingSlots,
        isFull,
        deliveryWindow,
        batchStatus: status,
        batchId,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return list;
}

/**
 * Fornece as informações exatas e humanizadas para a vitrine e cards de produtos:
 *
 * Pão Caseiro com Nutella
 * Produção: terças e sextas
 * Próxima entrega:
 * Sexta-feira, 18/09
 * Disponibilidade:
 * 8 de 10 unidades
 */
export function getProductBatchDisplayInfo(
  product: Product,
  orders: Order[] = [],
  batches: ProductionBatch[] = []
): ProductBatchDisplayInfo {
  const schedule = getProductEffectiveScheduleConfig(product);
  const daysLabel = schedule.days_label || formatDaysLabel(schedule.available_days);
  const deliveryWindow = schedule.delivery_window || '14:00 - 18:00';

  // Encontra a PRIMEIRA fornada teórica do calendário (com requestedQuantity = 0 para avaliar ocupação)
  const upcoming = getUpcomingBatches(product, orders, 4, new Date(), 1, batches);
  const earliestBatch = upcoming[0] || null;

  // Encontra a primeira fornada que ainda tenha pelo menos 1 vaga
  const nextAvailableBatch = getNextAvailableBatch(product, orders, new Date(), 1, batches);

  // Se a primeira fornada do calendário estiver esgotada (remainingSlots === 0)
  const isFirstBatchFull = !!earliestBatch && earliestBatch.remainingSlots <= 0;

  let firstBatchNotice: string | null = null;
  if (isFirstBatchFull && earliestBatch) {
    const dayName = earliestBatch.weekdayName.toLowerCase().replace('-feira', '');
    firstBatchNotice = `Fornada de ${dayName} esgotada`;
  }

  const nextDeliveryDateLabel = nextAvailableBatch ? nextAvailableBatch.formattedDate : null;

  let availabilityText = '';
  if (nextAvailableBatch) {
    availabilityText = 'Disponível para entrega';
  } else {
    availabilityText = 'Fornadas temporariamente esgotadas';
  }

  return {
    isScheduled: true,
    productionDaysLabel: daysLabel,
    deliveryWindow,
    earliestBatch,
    nextAvailableBatch,
    isFirstBatchFull,
    firstBatchNotice,
    nextDeliveryDateLabel,
    availabilityText,
  };
}

