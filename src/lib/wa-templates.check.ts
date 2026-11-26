import assert from "node:assert/strict";
import {
  buildWaLink,
  STATUS_LABELS,
  waTemplateOrderCreated,
  waTemplateStatusUpdate,
} from "./wa-templates";

const createdMsg = waTemplateOrderCreated({
  orderCode: "ORD-2611-001",
  customerName: "Kopi Senja",
  shopName: "StikerTempel",
  trackingUrl: "https://example.com/track/123",
  totalPrice: 500000,
  totalPaid: 200000,
  remaining: 300000,
  bankInfo: "BCA 1234567890",
});

assert.ok(createdMsg.includes("ORD-2611-001"));
assert.ok(createdMsg.includes("Kopi Senja"));
assert.ok(createdMsg.includes("BCA 1234567890"));
assert.ok(createdMsg.includes("https://example.com/track/123"));

const statusMsg = waTemplateStatusUpdate({
  orderCode: "ORD-2611-001",
  customerName: "Kopi Senja",
  shopName: "StikerTempel",
  trackingUrl: "https://example.com/track/123",
  totalPrice: 500000,
  totalPaid: 500000,
  remaining: 0,
  statusLabel: STATUS_LABELS.READY_FOR_PICKUP,
  trackingNumber: "JNE-999",
});

assert.ok(statusMsg.includes("Siap Diambil / Dikirim"));
assert.ok(statusMsg.includes("JNE-999"));
assert.ok(!statusMsg.includes("Sisa Tagihan"));

const waUrl = buildWaLink("6281234567890", createdMsg);
assert.ok(waUrl.startsWith("https://wa.me/6281234567890?text="));

console.log("wa-templates check passed");
