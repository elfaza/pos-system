"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AdminShell from "@/features/admin/components/admin-shell";
import { sanitizeDecimalInput } from "@/lib/number";
import type {
  IngredientRecord,
  StockMovementRecord,
} from "@/features/inventory/types";

interface IngredientForm {
  id: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: string;
  lowStockThreshold: string;
  isActive: boolean;
}

const emptyIngredientForm: IngredientForm = {
  id: "",
  name: "",
  sku: "",
  unit: "gram",
  currentStock: "0",
  lowStockThreshold: "",
  isActive: true,
};

const ingredientUnits = ["gram", "kg", "ml", "liter", "pcs"] as const;

function toIngredientForm(ingredient: IngredientRecord): IngredientForm {
  return {
    id: ingredient.id,
    name: ingredient.name,
    sku: ingredient.sku ?? "",
    unit: ingredient.unit,
    currentStock: ingredient.currentStock.toString(),
    lowStockThreshold: ingredient.lowStockThreshold?.toString() ?? "",
    isActive: ingredient.isActive,
  };
}

function stockStatusClass(status: IngredientRecord["stockStatus"]) {
  if (status === "out") return "border-[var(--danger)]/30 bg-red-50 text-[var(--danger)]";
  if (status === "low") return "border-[var(--warning)]/30 bg-orange-50 text-[var(--warning)]";
  if (status === "inactive") return "border-slate-200 bg-slate-100 text-[var(--muted-foreground)]";
  return "border-[var(--success)]/30 bg-green-50 text-[var(--success)]";
}

function formatMovementType(type: StockMovementRecord["type"]) {
  return type.replaceAll("_", " ");
}

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<IngredientRecord[]>([]);
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [form, setForm] = useState<IngredientForm>(emptyIngredientForm);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [movementType, setMovementType] = useState("");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustDirection, setAdjustDirection] = useState<"increase" | "decrease">("increase");
  const [adjustType, setAdjustType] = useState<"adjustment" | "waste">("adjustment");
  const [adjustReason, setAdjustReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const editing = Boolean(form.id);
  const selectedIngredient = useMemo(
    () => ingredients.find((ingredient) => ingredient.id === selectedIngredientId) ?? null,
    [ingredients, selectedIngredientId],
  );
  const lowStockCount = ingredients.filter(
    (ingredient) => ingredient.stockStatus === "low" || ingredient.stockStatus === "out",
  ).length;

  async function loadInventory() {
    setLoading(true);
    setError(null);

    try {
      const ingredientQuery = new URLSearchParams();
      if (search) ingredientQuery.set("search", search);
      if (activeFilter) ingredientQuery.set("active", activeFilter);
      if (lowStockOnly) ingredientQuery.set("lowStockOnly", "true");

      const movementQuery = new URLSearchParams();
      if (selectedIngredientId) movementQuery.set("ingredientId", selectedIngredientId);
      if (movementType) movementQuery.set("type", movementType);

      const [ingredientResponse, movementResponse] = await Promise.all([
        fetch(`/api/ingredients?${ingredientQuery.toString()}`),
        fetch(`/api/stock-movements?${movementQuery.toString()}`),
      ]);
      const [ingredientData, movementData] = await Promise.all([
        ingredientResponse.json(),
        movementResponse.json(),
      ]);

      if (!ingredientResponse.ok) {
        throw new Error(ingredientData.error ?? "Unable to load ingredients.");
      }
      if (!movementResponse.ok) {
        throw new Error(movementData.error ?? "Unable to load stock movements.");
      }

      setIngredients(ingredientData.ingredients);
      setMovements(movementData.movements);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load inventory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsOnline(window.navigator.onLine);
      void loadInventory();
    }, 0);

    function handleOnline() {
      setIsOnline(true);
      void loadInventory();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // Explicit Apply controls reload filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitIngredient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isOnline) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(editing ? `/api/ingredients/${form.id}` : "/api/ingredients", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku || null,
          unit: form.unit,
          currentStock: form.currentStock || "0",
          lowStockThreshold: form.lowStockThreshold || null,
          isActive: form.isActive,
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to save ingredient.");

      setForm(emptyIngredientForm);
      setMessage(editing ? "Ingredient updated." : "Ingredient created.");
      await loadInventory();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save ingredient.");
    } finally {
      setSaving(false);
    }
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isOnline || !selectedIngredientId) return;

    setAdjusting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/ingredients/${selectedIngredientId}/adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: adjustQuantity,
          direction: adjustType === "waste" ? "decrease" : adjustDirection,
          type: adjustType,
          reason: adjustReason,
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to adjust stock.");

      setAdjustQuantity("");
      setAdjustReason("");
      setMessage(adjustType === "waste" ? "Waste recorded." : "Stock adjusted.");
      await loadInventory();
    } catch (adjustError) {
      setError(adjustError instanceof Error ? adjustError.message : "Unable to adjust stock.");
    } finally {
      setAdjusting(false);
    }
  }

  return (
    <AdminShell title="Inventory" eyebrow="Admin stock control">
      <div className="grid gap-4">
        {!isOnline ? (
          <div className="rounded-md border border-[var(--warning)]/30 bg-orange-50 p-3 text-sm text-[var(--warning)]">
            Connection lost. Inventory changes are disabled until the POS reconnects.
          </div>
        ) : null}
        {message ? (
          <div className="rounded-md border border-[var(--success)]/30 bg-green-50 p-3 text-sm text-[var(--success)]">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-md border border-[var(--danger)]/30 bg-red-50 p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-md border border-[var(--border)] bg-[var(--card)]">
            <div className="grid gap-3 border-b border-[var(--border)] p-4 lg:grid-cols-[1fr_160px_auto_auto]">
              <label className="grid gap-1 text-sm font-medium">
                Search
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name or SKU"
                  className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Active
                <select
                  value={activeFilter}
                  onChange={(event) => setActiveFilter(event.target.value)}
                  className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
              <label className="flex h-11 items-center gap-2 self-end rounded-md border border-[var(--border)] px-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(event) => setLowStockOnly(event.target.checked)}
                />
                Low only
              </label>
              <button
                onClick={() => void loadInventory()}
                disabled={loading}
                className="h-11 self-end rounded-md border border-[var(--border)] px-4 font-medium hover:bg-[var(--muted)] disabled:opacity-60"
              >
                Apply
              </button>
            </div>

            <div className="border-b border-[var(--border)] bg-slate-50 px-4 py-3 text-sm">
              <span className="font-semibold">{lowStockCount}</span>{" "}
              active ingredient(s) are low or out of stock in this view.
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Ingredient</th>
                    <th className="px-4 py-3 font-medium">Unit</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                    <th className="px-4 py-3 font-medium">Threshold</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <tr key={index} className="border-b border-[var(--border)]">
                        <td className="px-4 py-4" colSpan={6}>
                          <div className="h-5 rounded-md bg-[var(--muted)]" />
                        </td>
                      </tr>
                    ))
                  ) : ingredients.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-[var(--muted-foreground)]" colSpan={6}>
                        No ingredients found.
                      </td>
                    </tr>
                  ) : (
                    ingredients.map((ingredient) => (
                      <tr
                        key={ingredient.id}
                        className={`border-b border-[var(--border)] ${
                          ingredient.stockStatus === "out"
                            ? "bg-red-50/60"
                            : ingredient.stockStatus === "low"
                              ? "bg-orange-50/60"
                              : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">{ingredient.name}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {ingredient.sku ?? "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3">{ingredient.unit}</td>
                        <td className="px-4 py-3">{ingredient.currentStock}</td>
                        <td className="px-4 py-3">{ingredient.lowStockThreshold ?? "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md border px-2 py-1 text-xs font-medium ${stockStatusClass(ingredient.stockStatus)}`}>
                            {ingredient.stockStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setForm(toIngredientForm(ingredient))}
                              className="h-10 rounded-md border border-[var(--border)] px-3 font-medium hover:bg-[var(--muted)]"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setSelectedIngredientId(ingredient.id)}
                              className="h-10 rounded-md border border-[var(--border)] px-3 font-medium hover:bg-[var(--muted)]"
                            >
                              Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-4">
            <form
              onSubmit={submitIngredient}
              className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <h2 className="font-semibold">{editing ? "Edit ingredient" : "Add ingredient"}</h2>
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1 text-sm font-medium">
                  Name
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    required
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-medium">
                    SKU
                    <input
                      value={form.sku}
                      onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))}
                      className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium">
                    Unit
                    <select
                      value={form.unit}
                      onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
                      className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                      required
                    >
                      {ingredientUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-medium">
                    Current stock
                    <input
                      inputMode="decimal"
                      value={form.currentStock}
                      disabled={editing}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          currentStock: sanitizeDecimalInput(event.target.value),
                        }))
                      }
                      className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:bg-slate-100"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium">
                    Low threshold
                    <input
                      inputMode="decimal"
                      value={form.lowStockThreshold}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          lowStockThreshold: sanitizeDecimalInput(event.target.value),
                        }))
                      }
                      className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                  />
                  Active for new recipes
                </label>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  disabled={saving || !isOnline}
                  className="h-11 rounded-md bg-[var(--primary)] px-4 font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
                >
                  {saving ? "Saving..." : editing ? "Save changes" : "Add ingredient"}
                </button>
                {editing ? (
                  <button
                    type="button"
                    onClick={() => setForm(emptyIngredientForm)}
                    className="h-11 rounded-md border border-[var(--border)] px-4 font-medium hover:bg-[var(--muted)]"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>

            <form
              onSubmit={submitAdjustment}
              className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <h2 className="font-semibold">Adjust stock</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {selectedIngredient
                  ? `${selectedIngredient.name}: ${selectedIngredient.currentStock} ${selectedIngredient.unit}`
                  : "Select an ingredient row first."}
              </p>
              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-medium">
                    Type
                    <select
                      value={adjustType}
                      onChange={(event) => setAdjustType(event.target.value as "adjustment" | "waste")}
                      className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    >
                      <option value="adjustment">Adjustment</option>
                      <option value="waste">Waste</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-medium">
                    Direction
                    <select
                      value={adjustType === "waste" ? "decrease" : adjustDirection}
                      disabled={adjustType === "waste"}
                      onChange={(event) => setAdjustDirection(event.target.value as "increase" | "decrease")}
                      className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:bg-slate-100"
                    >
                      <option value="increase">Increase</option>
                      <option value="decrease">Decrease</option>
                    </select>
                  </label>
                </div>
                <label className="grid gap-1 text-sm font-medium">
                  Quantity
                  <input
                    inputMode="decimal"
                    value={adjustQuantity}
                    onChange={(event) =>
                      setAdjustQuantity(sanitizeDecimalInput(event.target.value))
                    }
                    className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    required
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Reason
                  <textarea
                    value={adjustReason}
                    onChange={(event) => setAdjustReason(event.target.value)}
                    className="min-h-20 rounded-md border border-[var(--border)] px-3 py-2 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    required
                  />
                </label>
              </div>
              <button
                disabled={adjusting || !isOnline || !selectedIngredientId}
                className="mt-4 h-11 rounded-md bg-[var(--primary)] px-4 font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {adjusting ? "Saving..." : adjustType === "waste" ? "Record waste" : "Save adjustment"}
              </button>
            </form>
          </div>
        </div>

        <section className="rounded-md border border-[var(--border)] bg-[var(--card)]">
          <div className="grid gap-3 border-b border-[var(--border)] p-4 md:grid-cols-[1fr_220px_auto]">
            <label className="grid gap-1 text-sm font-medium">
              Ingredient
              <select
                value={selectedIngredientId}
                onChange={(event) => setSelectedIngredientId(event.target.value)}
                className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                <option value="">All ingredients</option>
                {ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Movement type
              <select
                value={movementType}
                onChange={(event) => setMovementType(event.target.value)}
                className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                <option value="">All types</option>
                <option value="sale_deduction">Sale deduction</option>
                <option value="adjustment">Adjustment</option>
                <option value="waste">Waste</option>
              </select>
            </label>
            <button
              onClick={() => void loadInventory()}
              disabled={loading}
              className="h-11 self-end rounded-md border border-[var(--border)] px-4 font-medium hover:bg-[var(--muted)] disabled:opacity-60"
            >
              Refresh history
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Ingredient</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Quantity</th>
                  <th className="px-4 py-3 font-medium">Context</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-[var(--muted-foreground)]" colSpan={6}>
                      Loading history...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-[var(--muted-foreground)]" colSpan={6}>
                      No stock movements found.
                    </td>
                  </tr>
                ) : (
                  movements.map((movement) => (
                    <tr key={movement.id} className="border-b border-[var(--border)]">
                      <td className="px-4 py-3">{new Date(movement.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3">{movement.ingredientName ?? "-"}</td>
                      <td className="px-4 py-3 capitalize">{formatMovementType(movement.type)}</td>
                      <td className={`px-4 py-3 font-medium ${movement.quantityChange < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                        {movement.quantityChange}
                      </td>
                      <td className="px-4 py-3">
                        {movement.productName ?? movement.orderId ?? movement.createdByUserName ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{movement.reason ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
