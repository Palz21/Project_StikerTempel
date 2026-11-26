"use client";

import { useState } from "react";
import type { OrderItemInput } from "@/lib/validations";
import { formatRupiah } from "@/lib/formatters";
import { compressAndUploadImage } from "@/lib/client-upload";
import { CATEGORY_LABELS } from "@/lib/wa-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Upload, X } from "lucide-react";

export interface MaterialOption {
  id: string;
  name: string;
  category: "CUP" | "PLASTIK" | "DTF_BAJU" | "LAINNYA";
  stockQty?: number;
  unit?: string;
}

export function createDefaultItem(
  category: OrderItemInput["category"] = "CUP"
): OrderItemInput {
  switch (category) {
    case "CUP":
      return {
        category: "CUP",
        rawMaterialId: null,
        itemName: "",
        qty: 500,
        unitPrice: 0,
        logoUrl: null,
        specs: {
          size: "16oz",
          cupType: "Datar",
          colorCount: 1,
          lidType: "Flat",
        },
      };
    case "PLASTIK":
      return {
        category: "PLASTIK",
        rawMaterialId: null,
        itemName: "",
        qty: 500,
        unitPrice: 0,
        logoUrl: null,
        specs: {
          size: "20x35",
          plasticColor: "Putih Susu",
          colorCount: 1,
          sides: "1 Sisi",
        },
      };
    case "DTF_BAJU":
      return {
        category: "DTF_BAJU",
        rawMaterialId: null,
        itemName: "",
        qty: 12,
        unitPrice: 0,
        logoUrl: null,
        specs: {
          apparelType: "Kaos",
          bringOwnApparel: false,
          printArea: "A3",
          sizeBreakdown: "M:4, L:4, XL:4",
        },
      };
    case "LAINNYA":
      return {
        category: "LAINNYA",
        rawMaterialId: null,
        itemName: "",
        qty: 100,
        unitPrice: 0,
        logoUrl: null,
        specs: {
          description: "",
        },
      };
  }
}

const selectClassName =
  "h-11 w-full cursor-pointer rounded-lg border border-input bg-white px-3 text-sm text-slate-900 transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9";

interface DynamicItemFormProps {
  mode: "admin" | "client";
  items: OrderItemInput[];
  onChange: (items: OrderItemInput[]) => void;
  materials?: MaterialOption[];
}

export function DynamicItemForm({
  mode,
  items,
  onChange,
  materials = [],
}: DynamicItemFormProps) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<number, string>>({});

  function updateItem(index: number, next: OrderItemInput) {
    const copy = [...items];
    copy[index] = next;
    onChange(copy);
  }

  function handleCategoryChange(
    index: number,
    newCategory: OrderItemInput["category"]
  ) {
    const current = items[index];
    const fresh = createDefaultItem(newCategory);
    updateItem(index, {
      ...fresh,
      itemName: current.itemName,
      logoUrl: current.logoUrl,
      unitPrice: mode === "admin" ? current.unitPrice : 0,
    });
  }

  function handleAddItem() {
    onChange([...items, createDefaultItem("CUP")]);
  }

  function handleRemoveItem(index: number) {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  }

  async function handleLogoUpload(index: number, file: File | undefined) {
    if (!file) return;
    setUploadingIndex(index);
    setUploadErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

    const result = await compressAndUploadImage(file);
    setUploadingIndex(null);

    if (!result.success) {
      setUploadErrors((prev) => ({ ...prev, [index]: result.error }));
      return;
    }

    updateItem(index, { ...items[index], logoUrl: result.url });
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const filteredMaterials = materials.filter(
          (m) => m.category === item.category
        );
        const isOwnApparel =
          item.category === "DTF_BAJU" && item.specs.bringOwnApparel;
        const subtotal = item.qty * (item.unitPrice ?? 0);

        return (
          <div
            key={index}
            className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Item #{index + 1}
              </h3>
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(index)}
                  className="min-h-9 cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700"
                  aria-label={`Hapus item ${index + 1}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  <span>Hapus</span>
                </Button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Kategori Layanan */}
              <div className="space-y-1.5">
                <Label htmlFor={`item-category-${index}`}>Kategori Layanan</Label>
                <select
                  id={`item-category-${index}`}
                  value={item.category}
                  onChange={(e) =>
                    handleCategoryChange(
                      index,
                      e.target.value as OrderItemInput["category"]
                    )
                  }
                  className={selectClassName}
                >
                  <option value="CUP">{CATEGORY_LABELS.CUP}</option>
                  <option value="PLASTIK">{CATEGORY_LABELS.PLASTIK}</option>
                  <option value="DTF_BAJU">{CATEGORY_LABELS.DTF_BAJU}</option>
                  <option value="LAINNYA">{CATEGORY_LABELS.LAINNYA}</option>
                </select>
              </div>

              {/* Nama Item */}
              <div className="space-y-1.5">
                <Label htmlFor={`item-name-${index}`}>
                  Nama Pesanan / Produk
                </Label>
                <Input
                  id={`item-name-${index}`}
                  required
                  value={item.itemName}
                  onChange={(e) =>
                    updateItem(index, { ...item, itemName: e.target.value })
                  }
                  placeholder={
                    item.category === "CUP"
                      ? "Contoh: Sablon Cup 16oz 1 Warna"
                      : item.category === "PLASTIK"
                        ? "Contoh: Kresek 20x35 Putih"
                        : item.category === "DTF_BAJU"
                          ? "Contoh: Kaos Komunitas DTF A3"
                          : "Contoh: Stiker Label Vinyl"
                  }
                  className="h-11 sm:h-9"
                />
              </div>

              {/* Bahan Baku Tertaut (mode admin, atau jika ada opsi material & bukan bawa sendiri) */}
              {mode === "admin" && !isOwnApparel && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`item-material-${index}`}>
                    Bahan Baku Gudang (Opsional untuk Potong Stok Otomatis)
                  </Label>
                  <select
                    id={`item-material-${index}`}
                    value={item.rawMaterialId ?? ""}
                    onChange={(e) =>
                      updateItem(index, {
                        ...item,
                        rawMaterialId: e.target.value || null,
                      })
                    }
                    className={selectClassName}
                  >
                    <option value="">
                      Tidak ditautkan ke stok bahan baku
                    </option>
                    {filteredMaterials.map((mat) => (
                      <option key={mat.id} value={mat.id}>
                        {mat.name}
                        {typeof mat.stockQty === "number"
                          ? ` (Stok: ${mat.stockQty} ${mat.unit ?? "pcs"})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dynamic Specs per Category */}
              {item.category === "CUP" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor={`cup-size-${index}`}>Ukuran Cup</Label>
                    <select
                      id={`cup-size-${index}`}
                      value={item.specs.size}
                      onChange={(e) =>
                        updateItem(index, {
                          ...item,
                          specs: { ...item.specs, size: e.target.value },
                        })
                      }
                      className={selectClassName}
                    >
                      <option value="12oz">12oz</option>
                      <option value="14oz">14oz</option>
                      <option value="16oz">16oz</option>
                      <option value="22oz">22oz</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`cup-type-${index}`}>Tipe Cup</Label>
                    <select
                      id={`cup-type-${index}`}
                      value={item.specs.cupType}
                      onChange={(e) =>
                        updateItem(index, {
                          ...item,
                          specs: {
                            ...item.specs,
                            cupType: e.target.value as "Datar" | "Oval",
                          },
                        })
                      }
                      className={selectClassName}
                    >
                      <option value="Datar">Datar</option>
                      <option value="Oval">Oval</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`cup-colors-${index}`}>Jumlah Warna</Label>
                    <select
                      id={`cup-colors-${index}`}
                      value={item.specs.colorCount}
                      onChange={(e) =>
                        updateItem(index, {
                          ...item,
                          specs: {
                            ...item.specs,
                            colorCount: Number(e.target.value),
                          },
                        })
                      }
                      className={selectClassName}
                    >
                      <option value={1}>1 Warna</option>
                      <option value={2}>2 Warna</option>
                      <option value={3}>3 Warna</option>
                      <option value={4}>4 Warna</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`cup-lid-${index}`}>Jenis Tutup</Label>
                    <select
                      id={`cup-lid-${index}`}
                      value={item.specs.lidType}
                      onChange={(e) =>
                        updateItem(index, {
                          ...item,
                          specs: { ...item.specs, lidType: e.target.value },
                        })
                      }
                      className={selectClassName}
                    >
                      <option value="Flat">Flat</option>
                      <option value="Dome">Dome</option>
                      <option value="Tanpa Tutup">Tanpa Tutup</option>
                    </select>
                  </div>
                </>
              )}

              {item.category === "PLASTIK" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor={`plastik-size-${index}`}>
                      Ukuran Plastik
                    </Label>
                    <Input
                      id={`plastik-size-${index}`}
                      required
                      value={item.specs.size}
                      onChange={(e) =>
                        updateItem(index, {
                          ...item,
                          specs: { ...item.specs, size: e.target.value },
                        })
                      }
                      placeholder="Contoh: 20x35 atau 25x40"
                      className="h-11 sm:h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`plastik-color-${index}`}>
                      Warna Plastik
                    </Label>
                    <Input
                      id={`plastik-color-${index}`}
                      required
                      value={item.specs.plasticColor}
                      onChange={(e) =>
                        updateItem(index, {
                          ...item,
                          specs: { ...item.specs, plasticColor: e.target.value },
                        })
                      }
                      placeholder="Contoh: Putih Susu, Hitam, Bening"
                      className="h-11 sm:h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`plastik-colors-${index}`}>
                      Jumlah Warna Sablon
                    </Label>
                    <select
                      id={`plastik-colors-${index}`}
                      value={item.specs.colorCount}
                      onChange={(e) =>
                        updateItem(index, {
                          ...item,
                          specs: {
                            ...item.specs,
                            colorCount: Number(e.target.value),
                          },
                        })
                      }
                      className={selectClassName}
                    >
                      <option value={1}>1 Warna</option>
                      <option value={2}>2 Warna</option>
                      <option value={3}>3 Warna</option>
                      <option value={4}>4 Warna</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`plastik-sides-${index}`}>Sisi Cetak</Label>
                    <select
                      id={`plastik-sides-${index}`}
                      value={item.specs.sides}
                      onChange={(e) =>
                        updateItem(index, {
                          ...item,
                          specs: {
                            ...item.specs,
                            sides: e.target.value as "1 Sisi" | "2 Sisi",
                          },
                        })
                      }
                      className={selectClassName}
                    >
                      <option value="1 Sisi">1 Sisi</option>
                      <option value="2 Sisi">2 Sisi</option>
                    </select>
                  </div>
                </>
              )}

              {item.category === "DTF_BAJU" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor={`dtf-apparel-${index}`}>
                      Jenis Pakaian
                    </Label>
                    <Input
                      id={`dtf-apparel-${index}`}
                      required
                      value={item.specs.apparelType}
                      onChange={(e) =>
                        updateItem(index, {
                          ...item,
                          specs: { ...item.specs, apparelType: e.target.value },
                        })
                      }
                      placeholder="Contoh: Kaos, Hoodie, Flanel"
                      className="h-11 sm:h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`dtf-area-${index}`}>Area Cetak</Label>
                    <Input
                      id={`dtf-area-${index}`}
                      required
                      value={item.specs.printArea}
                      onChange={(e) =>
                        updateItem(index, {
                          ...item,
                          specs: { ...item.specs, printArea: e.target.value },
                        })
                      }
                      placeholder="Contoh: Logo Dada, A4, A3"
                      className="h-11 sm:h-9"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor={`dtf-sizes-${index}`}>Rincian Ukuran</Label>
                    <Input
                      id={`dtf-sizes-${index}`}
                      required
                      value={item.specs.sizeBreakdown}
                      onChange={(e) =>
                        updateItem(index, {
                          ...item,
                          specs: {
                            ...item.specs,
                            sizeBreakdown: e.target.value,
                          },
                        })
                      }
                      placeholder="Contoh: S:4, M:10, L:10, XL:6"
                      className="h-11 sm:h-9"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-slate-700 sm:min-h-0">
                      <input
                        type="checkbox"
                        checked={item.specs.bringOwnApparel}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          updateItem(index, {
                            ...item,
                            rawMaterialId: checked ? null : item.rawMaterialId,
                            specs: {
                              ...item.specs,
                              bringOwnApparel: checked,
                            },
                          });
                        }}
                        className="size-4 cursor-pointer rounded border-slate-300"
                      />
                      <span>
                        Pelanggan bawa baju sendiri (tidak memotong stok kaos
                        polos)
                      </span>
                    </label>
                  </div>
                </>
              )}

              {item.category === "LAINNYA" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`lainnya-desc-${index}`}>
                    Keterangan Spesifikasi
                  </Label>
                  <Textarea
                    id={`lainnya-desc-${index}`}
                    value={item.specs.description ?? ""}
                    onChange={(e) =>
                      updateItem(index, {
                        ...item,
                        specs: { description: e.target.value },
                      })
                    }
                    placeholder="Jelaskan ukuran, bahan, warna, dan detail pengerjaan..."
                    rows={2}
                  />
                </div>
              )}

              {/* Qty & Price */}
              <div className="space-y-1.5">
                <Label htmlFor={`item-qty-${index}`}>Jumlah (pcs)</Label>
                <Input
                  id={`item-qty-${index}`}
                  type="number"
                  min={1}
                  required
                  value={item.qty || ""}
                  onChange={(e) =>
                    updateItem(index, {
                      ...item,
                      qty: Math.max(0, Number.parseInt(e.target.value || "0", 10)),
                    })
                  }
                  className="h-11 sm:h-9"
                />
              </div>

              {mode === "admin" ? (
                <div className="space-y-1.5">
                  <Label htmlFor={`item-price-${index}`}>
                    Harga Satuan (Rp)
                  </Label>
                  <Input
                    id={`item-price-${index}`}
                    type="number"
                    min={0}
                    required
                    value={item.unitPrice || ""}
                    onChange={(e) =>
                      updateItem(index, {
                        ...item,
                        unitPrice: Math.max(
                          0,
                          Number.parseInt(e.target.value || "0", 10)
                        ),
                      })
                    }
                    placeholder="0"
                    className="h-11 sm:h-9"
                  />
                </div>
              ) : (
                <div className="flex items-end">
                  <p className="text-xs text-slate-500">
                    Harga final dikonfirmasi admin setelah cek desain.
                  </p>
                </div>
              )}

              {/* Upload Logo */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor={`item-logo-${index}`}>
                  File Logo / Desain Mentah (Opsional, JPG/PNG/WEBP)
                </Label>
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor={`item-logo-${index}`}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:min-h-9"
                  >
                    <Upload className="size-4" aria-hidden="true" />
                    <span>
                      {uploadingIndex === index
                        ? "Mengompres & mengunggah..."
                        : item.logoUrl
                          ? "Ganti Gambar"
                          : "Pilih Gambar"}
                    </span>
                  </label>
                  <input
                    id={`item-logo-${index}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadingIndex === index}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      void handleLogoUpload(index, file);
                      e.target.value = "";
                    }}
                    className="sr-only"
                  />

                  {item.logoUrl && (
                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1">
                      <img
                        src={item.logoUrl}
                        alt={`Logo item ${index + 1}`}
                        className="h-8 w-8 rounded object-contain"
                        width={32}
                        height={32}
                      />
                      <span className="text-xs text-slate-600">Terunggah</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateItem(index, { ...item, logoUrl: null })
                        }
                        aria-label={`Hapus logo item ${index + 1}`}
                        className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
                {uploadErrors[index] && (
                  <p role="alert" className="text-xs text-red-600">
                    {uploadErrors[index]}
                  </p>
                )}
              </div>
            </div>

            {mode === "admin" && (
              <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
                <p className="text-sm font-medium text-slate-900">
                  Subtotal: {formatRupiah(subtotal)}
                </p>
              </div>
            )}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        onClick={handleAddItem}
        className="min-h-11 w-full cursor-pointer sm:min-h-9"
      >
        <Plus className="size-4" aria-hidden="true" />
        Tambah Item Lainnya
      </Button>
    </div>
  );
}
