"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AdminShell from "@/features/admin/components/admin-shell";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/currency";
import { sanitizeDecimalInput } from "@/lib/number";
import type {
  CategoryRecord,
  ProductRecord,
  ProductVariantRecord,
} from "@/features/catalog/types";
import type { IngredientRecord } from "@/features/inventory/types";

interface ProductForm {
  id: string;
  categoryId: string;
  name: string;
  sku: string;
  description: string;
  imageUrl: string;
  price: number;
  costPrice: string;
  trackStock: boolean;
  stockQuantity: string;
  lowStockThreshold: string;
  isAvailable: boolean;
  variants: Array<{
    id?: string;
    name: string;
    sku: string;
    priceDelta: number;
    costDelta: string;
    isActive: boolean;
  }>;
  recipes: Array<{
    ingredientId: string;
    variantId: string;
    quantityRequired: string;
  }>;
}

const emptyForm: ProductForm = {
  id: "",
  categoryId: "",
  name: "",
  sku: "",
  description: "",
  imageUrl: "",
  price: 0,
  costPrice: "",
  trackStock: false,
  stockQuantity: "",
  lowStockThreshold: "",
  isAvailable: true,
  variants: [],
  recipes: [],
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getProductStatus(product: ProductRecord) {
  if (!product.isAvailable) {
    return {
      label: "Hidden",
      className: "bg-slate-100 text-[var(--muted-foreground)]",
    };
  }

  if (!product.canSellOne) {
    return {
      label: product.unavailableReason ?? "Unavailable",
      className: "bg-red-50 text-[var(--danger)]",
    };
  }

  const isLowStock =
    product.trackStock &&
    product.stockQuantity !== null &&
    product.lowStockThreshold !== null &&
    product.stockQuantity > 0 &&
    product.stockQuantity <= product.lowStockThreshold;

  if (isLowStock) {
    return {
      label: "Low stock",
      className: "bg-orange-50 text-[var(--warning)]",
    };
  }

  return {
    label: "Available",
    className: "bg-green-50 text-[var(--success)]",
  };
}

function toVariantForm(variant: ProductVariantRecord): ProductForm["variants"][number] {
  return {
    id: variant.id,
    name: variant.name,
    sku: variant.sku ?? "",
    priceDelta: variant.priceDelta,
    costDelta: variant.costDelta?.toString() ?? "",
    isActive: variant.isActive,
  };
}

function toProductForm(product: ProductRecord): ProductForm {
  return {
    id: product.id,
    categoryId: product.categoryId,
    name: product.name,
    sku: product.sku ?? "",
    description: product.description ?? "",
    imageUrl: product.imageUrl ?? "",
    price: product.price,
    costPrice: product.costPrice?.toString() ?? "",
    trackStock: product.trackStock,
    stockQuantity: product.stockQuantity?.toString() ?? "",
    lowStockThreshold: product.lowStockThreshold?.toString() ?? "",
    isAvailable: product.isAvailable,
    variants: product.variants.map(toVariantForm),
    recipes: product.recipes.map((recipe) => ({
      ingredientId: recipe.ingredientId,
      variantId: recipe.variantId ?? "",
      quantityRequired: recipe.quantityRequired.toString(),
    })),
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [ingredients, setIngredients] = useState<IngredientRecord[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editing = useMemo(() => Boolean(form.id), [form.id]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ includeUnavailable: "true" });
      if (search) query.set("search", search);
      if (categoryFilter) query.set("categoryId", categoryFilter);

      const [productResponse, categoryResponse, ingredientResponse] = await Promise.all([
        fetch(`/api/products?${query.toString()}`),
        fetch("/api/categories?includeInactive=true"),
        fetch("/api/ingredients?active=true"),
      ]);
      const productData = await productResponse.json();
      const categoryData = await categoryResponse.json();
      const ingredientData = await ingredientResponse.json();

      if (!productResponse.ok) {
        throw new Error(productData.error ?? "Unable to load products.");
      }
      if (!categoryResponse.ok) {
        throw new Error(categoryData.error ?? "Unable to load categories.");
      }
      if (!ingredientResponse.ok) {
        throw new Error(ingredientData.error ?? "Unable to load ingredients.");
      }

      setProducts(productData.products);
      setCategories(categoryData.categories);
      setIngredients(ingredientData.ingredients);
      setForm((current) =>
        current.categoryId || categoryData.categories.length === 0
          ? current
          : { ...current, categoryId: categoryData.categories[0].id },
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeout);
    // The explicit search action below handles filter changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(editing ? `/api/products/${form.id}` : "/api/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          costPrice: form.costPrice || null,
          stockQuantity: form.stockQuantity || null,
          lowStockThreshold: form.lowStockThreshold || null,
          variants: form.variants.map((variant) => ({
            ...variant,
            sku: variant.sku || null,
            costDelta: variant.costDelta || null,
          })),
          recipes: form.recipes.map((recipe) => ({
            ingredientId: recipe.ingredientId,
            variantId: recipe.variantId || null,
            quantityRequired: recipe.quantityRequired,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save product.");
      setForm({
        ...emptyForm,
        categoryId: categories[0]?.id ?? "",
      });
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save product.");
    } finally {
      setSaving(false);
    }
  }

  function addVariant() {
    setForm((current) => ({
      ...current,
      variants: [
        ...current.variants,
        { name: "", sku: "", priceDelta: 0, costDelta: "", isActive: true },
      ],
    }));
  }

  function updateVariant(
    index: number,
    patch: Partial<ProductForm["variants"][number]>,
  ) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...patch } : variant,
      ),
    }));
  }

  function removeVariant(index: number) {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
    }));
  }

  function addRecipe() {
    setForm((current) => ({
      ...current,
      recipes: [
        ...current.recipes,
        {
          ingredientId: ingredients[0]?.id ?? "",
          variantId: "",
          quantityRequired: "1",
        },
      ],
    }));
  }

  function updateRecipe(
    index: number,
    patch: Partial<ProductForm["recipes"][number]>,
  ) {
    setForm((current) => ({
      ...current,
      recipes: current.recipes.map((recipe, recipeIndex) =>
        recipeIndex === index ? { ...recipe, ...patch } : recipe,
      ),
    }));
  }

  function removeRecipe(index: number) {
    setForm((current) => ({
      ...current,
      recipes: current.recipes.filter((_, recipeIndex) => recipeIndex !== index),
    }));
  }

  return (
    <AdminShell title="Products" eyebrow="Admin catalog">
      <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--card)]">
          <div className="grid gap-3 border-b border-[var(--border)] p-4 lg:grid-cols-[1fr_220px_auto]">
            <label className="grid gap-1 text-sm font-medium">
              Search
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, SKU, or category"
                className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Category
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => void loadData()}
              disabled={loading}
              className="h-11 self-end rounded-md border border-[var(--border)] px-4 text-sm font-medium hover:bg-[var(--muted)] disabled:opacity-60"
            >
              Apply
            </button>
          </div>

          {error ? (
            <p className="m-4 rounded-md border border-[var(--danger)]/30 bg-red-50 p-3 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Recipe</th>
                  <th className="px-4 py-3 font-medium">Available</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index} className="border-b border-[var(--border)]">
                      <td className="px-4 py-4" colSpan={8}>
                        <div className="h-5 rounded-md bg-[var(--muted)]" />
                      </td>
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-[var(--muted-foreground)]" colSpan={8}>
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const status = getProductStatus(product);

                    return (
                      <tr key={product.id} className="border-b border-[var(--border)]">
                        <td className="px-4 py-3">
                          <p className="font-medium">{product.name}</p>
                          {product.variants.length > 0 ? (
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {product.variants.length} variant(s)
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{product.categoryName}</td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">
                          {product.sku ?? "-"}
                        </td>
                        <td className="px-4 py-3">{formatCurrency(product.price)}</td>
                        <td className="px-4 py-3">
                          {product.trackStock
                            ? `${product.stockQuantity ?? 0} / low ${product.lowStockThreshold ?? 0}`
                            : "Not tracked"}
                        </td>
                        <td className="px-4 py-3">
                          {product.ingredientRecipeCount > 0
                            ? `${product.ingredientRecipeCount} row(s)`
                            : "No recipe"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setForm(toProductForm(product))}
                            className="h-10 rounded-md border border-[var(--border)] px-3 font-medium hover:bg-[var(--muted)]"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <h2 className="font-semibold">{editing ? "Edit product" : "Add product"}</h2>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1 text-sm font-medium">
              Category
              <select
                value={form.categoryId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, categoryId: event.target.value }))
                }
                className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                required
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                Name
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  required
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                SKU
                <input
                  value={form.sku}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sku: event.target.value }))
                  }
                  className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                Price before tax/service
                <input
                  inputMode="numeric"
                  value={formatCurrencyInput(form.price)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      price: Number(parseCurrencyInput(event.target.value) || 0),
                    }))
                  }
                  className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  required
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Cost price
                <input
                  inputMode="numeric"
                  value={formatCurrencyInput(form.costPrice)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      costPrice: parseCurrencyInput(event.target.value),
                    }))
                  }
                  className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-medium">
              Description
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                className="min-h-20 rounded-md border border-[var(--border)] px-3 py-2 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Image URL
              <input
                value={form.imageUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, imageUrl: event.target.value }))
                }
                className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              />
            </label>
            <div className="grid gap-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isAvailable: event.target.checked,
                    }))
                  }
                />
                Available in POS
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.trackStock}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      trackStock: event.target.checked,
                    }))
                  }
                />
                Track stock
              </label>
            </div>
            {form.trackStock ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium">
                  Stock quantity
                  <input
                    inputMode="decimal"
                    value={form.stockQuantity}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        stockQuantity: sanitizeDecimalInput(event.target.value),
                      }))
                    }
                    className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Low stock threshold
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
            ) : null}

            <div className="rounded-md border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Variants</h3>
                <button
                  type="button"
                  onClick={addVariant}
                  className="h-10 rounded-md border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--muted)]"
                >
                  Add variant
                </button>
              </div>
              <div className="mt-3 grid gap-3">
                {form.variants.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    No variants. Checkout will use the base product price.
                  </p>
                ) : (
                  form.variants.map((variant, index) => (
                    <div key={`${variant.id ?? "new"}-${index}`} className="grid gap-2 rounded-md bg-[var(--muted)] p-3">
                      <input
                        value={variant.name}
                        onChange={(event) => updateVariant(index, { name: event.target.value })}
                        placeholder="Variant name"
                        className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
                        required
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          value={variant.sku}
                          onChange={(event) => updateVariant(index, { sku: event.target.value })}
                          placeholder="Variant SKU"
                          className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
                        />
                        <input
                          inputMode="numeric"
                          value={formatCurrencyInput(variant.priceDelta)}
                          onChange={(event) =>
                            updateVariant(index, {
                              priceDelta: Number(parseCurrencyInput(event.target.value) || 0),
                            })
                          }
                          placeholder="Price delta"
                          className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={variant.isActive}
                            onChange={(event) =>
                              updateVariant(index, { isActive: event.target.checked })
                            }
                          />
                          Active
                        </label>
                        <button
                          type="button"
                          onClick={() => removeVariant(index)}
                          className="h-10 rounded-md border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--card)]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-md border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Ingredient recipe</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Quantity required to sell one product unit.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addRecipe}
                  disabled={ingredients.length === 0}
                  className="h-10 rounded-md border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--muted)] disabled:opacity-60"
                >
                  Add row
                </button>
              </div>
              <div className="mt-3 grid gap-3">
                {ingredients.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Add active ingredients on the inventory page before creating recipes.
                  </p>
                ) : form.recipes.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    No ingredient recipe. Checkout will only use product availability.
                  </p>
                ) : (
                  form.recipes.map((recipe, index) => (
                    <div key={index} className="grid gap-2 rounded-md bg-[var(--muted)] p-3">
                      <label className="grid gap-1 text-xs font-medium">
                        Ingredient
                        <select
                          value={recipe.ingredientId}
                          onChange={(event) =>
                            updateRecipe(index, { ingredientId: event.target.value })
                          }
                          className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
                          required
                        >
                          {ingredients.map((ingredient) => (
                            <option key={ingredient.id} value={ingredient.id}>
                              {ingredient.name} ({ingredient.unit})
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="grid gap-1 text-xs font-medium">
                          Variant
                          <select
                            value={recipe.variantId}
                            onChange={(event) =>
                              updateRecipe(index, { variantId: event.target.value })
                            }
                            className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
                          >
                            <option value="">Base product</option>
                            {form.variants
                              .filter((variant) => variant.id)
                              .map((variant) => (
                                <option key={variant.id} value={variant.id}>
                                  {variant.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label className="grid gap-1 text-xs font-medium">
                          Quantity
                          <input
                            inputMode="decimal"
                            value={recipe.quantityRequired}
                            onChange={(event) =>
                              updateRecipe(index, {
                                quantityRequired: sanitizeDecimalInput(event.target.value),
                              })
                            }
                            className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
                            required
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRecipe(index)}
                        className="h-10 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium hover:bg-white"
                      >
                        Remove recipe row
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              disabled={saving || categories.length === 0}
              className="h-11 rounded-md bg-[var(--primary)] px-4 font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              {saving ? "Saving..." : editing ? "Save changes" : "Add product"}
            </button>
            {editing ? (
              <button
                type="button"
                onClick={() => setForm({ ...emptyForm, categoryId: categories[0]?.id ?? "" })}
                className="h-11 rounded-md border border-[var(--border)] px-4 font-medium hover:bg-[var(--muted)]"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
