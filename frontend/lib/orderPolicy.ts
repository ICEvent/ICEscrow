import {
    ORDER_STATUS_CANCELED,
    ORDER_STATUS_CLOSED,
    ORDER_STATUS_DEPOSITED,
    ORDER_STATUS_DELIVERED,
    ORDER_STATUS_NEW,
    ORDER_STATUS_RECEIVED,
    ORDER_STATUS_REFUNDED,
    ORDER_STATUS_RELEASED,
} from './constants';

export type RefundMode = 'seller_refund' | 'buyer_recovery' | null;

export function getOrderStatus(statusVariant: Record<string, unknown> | null | undefined): string {
    return statusVariant ? Object.keys(statusVariant)[0] ?? '' : '';
}

export function canCancelOrder(status: string, isBuyer: boolean, isSeller: boolean): boolean {
    return (status === ORDER_STATUS_NEW && isBuyer)
        || (status === ORDER_STATUS_DEPOSITED && isSeller);
}

export function refundModeForOrder(status: string, isBuyer: boolean, isSeller: boolean): RefundMode {
    if (isSeller
        && status !== ORDER_STATUS_RELEASED
        && status !== ORDER_STATUS_REFUNDED
        && status !== ORDER_STATUS_CLOSED) {
        return 'seller_refund';
    }

    if (isBuyer && (status === ORDER_STATUS_NEW || status === ORDER_STATUS_CANCELED)) {
        return 'buyer_recovery';
    }

    return null;
}

export function canCloseOrder(status: string, isBuyer: boolean, isSeller: boolean): boolean {
    return (isBuyer || isSeller)
        && status !== ORDER_STATUS_CLOSED
        && status !== ORDER_STATUS_CANCELED
        && status !== ORDER_STATUS_REFUNDED;
}

export function needsProgressConfirmation(status: string, isBuyer: boolean, isSeller: boolean): boolean {
    return (status === ORDER_STATUS_NEW && isBuyer)
        || (status === ORDER_STATUS_DEPOSITED && isSeller)
        || (status === ORDER_STATUS_DELIVERED && isBuyer);
}

export function orderProgressStep(status: string): number {
    if (status === ORDER_STATUS_NEW) return 1;
    if (status === ORDER_STATUS_DEPOSITED) return 2;
    if (status === ORDER_STATUS_DELIVERED) return 3;
    if (status === ORDER_STATUS_RECEIVED) return 4;
    if (status === ORDER_STATUS_RELEASED || status === ORDER_STATUS_CLOSED) return 5;
    return 0;
}
