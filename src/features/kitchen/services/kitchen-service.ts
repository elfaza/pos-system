import { Prisma } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import type { User } from "@/features/auth/types";
import { requireModuleEnabled } from "@/features/catalog/services/module-config";
import {
  findKitchenOrderById,
  kitchenStatuses,
  listActiveKitchenOrders,
  listReadyQueueOrders,
  updateKitchenOrderStatus,
} from "../repositories/kitchen-repository";
import { buildKitchenBoard, buildQueueDisplay, mapKitchenOrder } from "./kitchen-mappers";
import type { KitchenStatus } from "../types";

const allowedTransitions: Record<KitchenStatus, KitchenStatus[]> = {
  received: ["preparing", "ready"],
  preparing: ["ready"],
  ready: ["completed"],
  completed: [],
};

export function parseKitchenStatus(value: unknown): KitchenStatus {
  if (
    typeof value !== "string" ||
    !kitchenStatuses.includes(value as KitchenStatus)
  ) {
    throw new ValidationError("Kitchen status is invalid.", {
      status: "Use received, preparing, ready, or completed.",
    });
  }

  return value as KitchenStatus;
}

function buildStatusTimestampPatch(
  currentStatus: KitchenStatus,
  nextStatus: KitchenStatus,
  now: Date,
) {
  const data: Prisma.OrderUpdateInput = {
    kitchenStatus: nextStatus,
  };

  if (nextStatus === "preparing" && currentStatus !== "preparing") {
    data.kitchenPreparingAt = now;
  }
  if (nextStatus === "ready" && currentStatus !== "ready") {
    data.kitchenReadyAt = now;
  }
  if (nextStatus === "completed" && currentStatus !== "completed") {
    data.kitchenCompletedAt = now;
  }

  return data;
}

export async function getKitchenBoard() {
  await requireModuleEnabled("kitchenEnabled");
  const orders = await listActiveKitchenOrders();
  return buildKitchenBoard(orders.map(mapKitchenOrder));
}

export async function getQueueDisplay() {
  await requireModuleEnabled("queueEnabled");
  const orders = await listReadyQueueOrders();
  return buildQueueDisplay(orders.map(mapKitchenOrder));
}

export async function changeKitchenStatus(
  orderId: string,
  nextStatus: KitchenStatus,
  actor: User,
) {
  await requireModuleEnabled("kitchenEnabled");
  const updatedOrder = await prisma.$transaction(async (tx) => {
    const order = await findKitchenOrderById(orderId, tx);

    if (!order) {
      throw new NotFoundError("Kitchen order was not found.");
    }

    if (order.status !== "paid") {
      throw new ValidationError("Kitchen order must be paid before status updates.", {
        status: "Only paid orders can be updated by the kitchen.",
      });
    }

    if (!order.kitchenStatus) {
      throw new ValidationError("Kitchen order is missing kitchen status.", {
        status: "Kitchen status is required.",
      });
    }

    if (order.kitchenStatus === nextStatus) {
      return order;
    }

    const currentStatus = order.kitchenStatus;
    if (!allowedTransitions[currentStatus].includes(nextStatus)) {
      throw new ValidationError("Kitchen status transition is invalid.", {
        status: `${currentStatus} cannot move to ${nextStatus}.`,
      });
    }

    const changedAt = new Date();
    const changedOrder = await updateKitchenOrderStatus(
      order.id,
      buildStatusTimestampPatch(currentStatus, nextStatus, changedAt),
      tx,
    );

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        action: "kitchen.status_changed",
        entityType: "order",
        entityId: order.id,
        metadata: {
          orderNumber: order.orderNumber,
          queueNumber: order.queueNumber,
          queueBusinessDate: order.queueBusinessDate,
          previousStatus: currentStatus,
          status: nextStatus,
          changedAt: changedAt.toISOString(),
        },
      },
    });

    return changedOrder;
  });

  return mapKitchenOrder(updatedOrder);
}
