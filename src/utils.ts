import { differenceInDays, parseISO, isPast, isWithinInterval, addDays } from 'date-fns';
import { Instrument } from './firebase';

export function calculateInstrumentStatus(expiryDateStr: string): Instrument['status'] {
  if (!expiryDateStr) return 'Valid';
  const expiryDate = parseISO(expiryDateStr);
  const today = new Date();

  if (isPast(expiryDate)) {
    return 'Expired';
  }

  const thirtyDaysFromNow = addDays(today, 30);
  if (isWithinInterval(expiryDate, { start: today, end: thirtyDaysFromNow })) {
    return 'Expiring Soon';
  }

  return 'Valid';
}

export function getStatusColor(status: Instrument['status']) {
  switch (status) {
    case 'Expired':
      return 'text-red-600 bg-red-100 border-red-200';
    case 'Expiring Soon':
      return 'text-amber-600 bg-amber-100 border-amber-200';
    case 'Valid':
      return 'text-emerald-600 bg-emerald-100 border-emerald-200';
    default:
      return 'text-gray-600 bg-gray-100 border-gray-200';
  }
}
