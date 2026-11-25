"use server";

import { z } from "zod";
import { DesignStatus, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculatePaymentSummary, type PaymentSummary } from "@/lib/formatters";

const uuidSchema = z.string().uuid();

export interface PublicOrderTrackingData {
  uuid: string;
  orderCode: string;
  customerName: string;
  status: OrderStatus;
  designStatus: DesignStatus;
  revisionCount: number;
  pickupMethod: "SELF_PICKUP" | "INSTANT_COURIER" | "EXPEDITION";
  trackingNumber: string | null;
  totalPrice: number;
  currentMockupUrl: string | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  canReviewDesign: boolean;
  items: Array<{
    id: string;
    category: "CUP" | "PLASTIK" | "DTF_BAJU" | "LAINNYA";
    itemName: string;
    specs: unknown;
    qty: number;
    unitPrice: number;
    subtotal: number;
    logoUrl: string | null;
  }>;
  revisions: Array<{
    version: number;
    mockupUrl: string;
    clientNote: string | null;
    adminNote: string | null;
    createdAt: Date;
  }>;
  paymentSummary: PaymentSummary;
  shop: {
    shopName: string;
    whatsappNumber: string;
    address: string;
    mapsUrl: string | null;
    bankInfo: string;
  };
}

/**
 * Fetch public-safe order tracking data by UUID v4 for /track/[uuid].
 * Returns null if UUID format is invalid or order does not exist (caller should invoke notFound()).
 */
export async function getPublicOrderByUuidAction(
  uuid: string
): Promise<PublicOrderTrackingData | null> {
  if (!uuidSchema.safeParse(uuid).success) {
    return null;
  }

  const [order, shop] = await Promise.all([
    prisma.order.findUnique({
      where: { uuid },
      select: {
        uuid: true,
        orderCode: true,
        customerName: true,
        status: true,
        designStatus: true,
        revisionCount: true,
        pickupMethod: true,
        trackingNumber: true,
        totalPrice: true,
        currentMockupUrl: true,
        cancelledAt: true,
        cancelReason: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            category: true,
            itemName: true,
            specs: true,
            qty: true,
            unitPrice: true,
            subtotal: true,
            logoUrl: true,
          },
          orderBy: { createdAt: "asc" },
        },
        revisions: {
          select: {
            version: true,
            mockupUrl: true,
            clientNote: true,
            adminNote: true,
            createdAt: true,
          },
          orderBy: { version: "desc" },
        },
        payments: {
          select: { amount: true },
        },
      },
    }),
    prisma.shopSetting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
      select: {
        shopName: true,
        whatsappNumber: true,
        address: true,
        mapsUrl: true,
        bankInfo: true,
      },
    }),
  ]);

  if (!order) {
    return null;
  }

  const isReviewStage =
    order.status === OrderStatus.PENDING_REVIEW ||
    order.status === OrderStatus.WAITING_ACC_PAYMENT;

  return {
    uuid: order.uuid,
    orderCode: order.orderCode,
    customerName: order.customerName,
    status: order.status,
    designStatus: order.designStatus,
    revisionCount: order.revisionCount,
    pickupMethod: order.pickupMethod,
    trackingNumber: order.trackingNumber,
    totalPrice: order.totalPrice,
    currentMockupUrl: order.currentMockupUrl,
    cancelledAt: order.cancelledAt,
    cancelReason: order.cancelReason,
    createdAt: order.createdAt,
    canReviewDesign:
      isReviewStage && order.designStatus === DesignStatus.WAITING_ACC,
    items: order.items,
    revisions: order.revisions,
    paymentSummary: calculatePaymentSummary(order.totalPrice, order.payments),
    shop,
  };
}
