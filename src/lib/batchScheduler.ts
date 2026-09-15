import { Order, Product } from '../types';

export interface BatchAvailability {
  dateString: string; // YYYY-MM-DD
  formattedDate: string; // Ex: "Sexta-feira, 18/09"
  shortDate: string; // Ex: "Sex, 18/09"
  weekdayName: string; // Ex: "Sexta-feira"
  capacity: number;
  bookedCount: number;
  remainingSlots: number;
  isFull: boolean;
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

/**
 * Conta quantas unidades de um produto foram agendadas para uma data específica
 */
export function getProductBookedQuantityForDate(
  productId: string,
  targetDate: string,
  orders: Order[] = []
): number {
  let booked = 0;
  for (const order of orders) {
    if (order.status === 'CANCELLED') continue;
    if (order.scheduled_date === targetDate) {
      for (const item of order.items) {
        if (item.product_id === productId) {
          booked += item.quantity;
        }
      }
    }
  }
  return booked;
}

/**
 * Encontra a próxima data de fornada disponível para um produto.
 * Se a cota do lote (ex: 10 unidades) para a primeira data estiver esgotada,
 * automaticamente avança para a data subsequente e assim sucessivamente.
 */
export function getNextAvailableBatch(
  product: Product,
  orders: Order[] = [],
  fromDate: Date = new Date()
): BatchAvailability | null {
  if (!product.schedule_config || !product.schedule_config.is_scheduled_only) {
    return null;
  }

  const { available_days, batch_limit } = product.schedule_config;
  if (!available_days || available_days.length === 0) {
    return null;
  }

  // Pães de fermentação lenta exigem no mínimo 24h de antecedência (começa a verificar a partir de amanhã)
  const current = new Date(fromDate);
  current.setDate(current.getDate() + 1);

  // Procura pelos próximos 45 dias a primeira fornada que ainda tenha vagas disponíveis
  for (let i = 0; i < 45; i++) {
    const dayOfWeek = current.getDay();

    if (available_days.includes(dayOfWeek)) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;

      const bookedCount = getProductBookedQuantityForDate(product.id, dateString, orders);
      const remainingSlots = Math.max(0, batch_limit - bookedCount);

      // Se ainda restam vagas para esta data, encontramos!
      if (remainingSlots > 0) {
        const weekdayName = WEEKDAY_NAMES[dayOfWeek];
        const shortDay = WEEKDAY_SHORT[dayOfWeek];

        return {
          dateString,
          formattedDate: `${weekdayName}, ${dd}/${mm}`,
          shortDate: `${shortDay}, ${dd}/${mm}`,
          weekdayName,
          capacity: batch_limit,
          bookedCount,
          remainingSlots,
          isFull: false,
        };
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return null;
}

/**
 * Retorna as próximas N fornadas (incluindo lotes cheios e disponíveis)
 */
export function getUpcomingBatches(
  product: Product,
  orders: Order[] = [],
  limitCount = 4
): BatchAvailability[] {
  if (!product.schedule_config || !product.schedule_config.is_scheduled_only) {
    return [];
  }

  const { available_days, batch_limit } = product.schedule_config;
  const list: BatchAvailability[] = [];

  const current = new Date();
  current.setDate(current.getDate() + 1);

  for (let i = 0; i < 60 && list.length < limitCount; i++) {
    const dayOfWeek = current.getDay();

    if (available_days.includes(dayOfWeek)) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;

      const bookedCount = getProductBookedQuantityForDate(product.id, dateString, orders);
      const remainingSlots = Math.max(0, batch_limit - bookedCount);
      const isFull = remainingSlots <= 0;

      list.push({
        dateString,
        formattedDate: `${WEEKDAY_NAMES[dayOfWeek]}, ${dd}/${mm}`,
        shortDate: `${WEEKDAY_SHORT[dayOfWeek]}, ${dd}/${mm}`,
        weekdayName: WEEKDAY_NAMES[dayOfWeek],
        capacity: batch_limit,
        bookedCount,
        remainingSlots,
        isFull,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return list;
}
