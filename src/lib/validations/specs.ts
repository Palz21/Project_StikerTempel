import { z } from "zod";

export const cupSpecsSchema = z.object({
  size: z.string().trim().min(1, "Ukuran cup wajib diisi"),
  cupType: z.enum(["Datar", "Oval"], {
    errorMap: () => ({ message: "Tipe cup harus Datar atau Oval" }),
  }),
  colorCount: z.coerce
    .number()
    .int()
    .min(1, "Minimal 1 warna")
    .max(4, "Maksimal 4 warna"),
  lidType: z.string().trim().min(1, "Jenis tutup wajib diisi"),
});

export const plastikSpecsSchema = z.object({
  size: z.string().trim().min(1, "Ukuran plastik wajib diisi"),
  plasticColor: z.string().trim().min(1, "Warna plastik wajib diisi"),
  colorCount: z.coerce
    .number()
    .int()
    .min(1, "Minimal 1 warna")
    .max(4, "Maksimal 4 warna"),
  sides: z.enum(["1 Sisi", "2 Sisi"], {
    errorMap: () => ({ message: "Sisi cetak harus 1 Sisi atau 2 Sisi" }),
  }),
});

export const dtfBajuSpecsSchema = z.object({
  apparelType: z.string().trim().min(1, "Jenis pakaian wajib diisi"),
  bringOwnApparel: z.boolean(),
  printArea: z.string().trim().min(1, "Area cetak wajib diisi"),
  sizeBreakdown: z.string().trim().min(1, "Rincian ukuran wajib diisi"),
});

export const lainnyaSpecsSchema = z.object({
  description: z.string().trim().optional(),
});

export type CupSpecs = z.infer<typeof cupSpecsSchema>;
export type PlastikSpecs = z.infer<typeof plastikSpecsSchema>;
export type DtfBajuSpecs = z.infer<typeof dtfBajuSpecsSchema>;
export type LainnyaSpecs = z.infer<typeof lainnyaSpecsSchema>;
export type OrderItemSpecs =
  | CupSpecs
  | PlastikSpecs
  | DtfBajuSpecs
  | LainnyaSpecs;
