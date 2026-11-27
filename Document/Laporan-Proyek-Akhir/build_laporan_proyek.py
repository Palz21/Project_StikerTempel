import os
import subprocess
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

import docx
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls


BASE_DIR = Path(__file__).resolve().parent
ASSETS_DIR = BASE_DIR / "assets"
SHARED_DIR = BASE_DIR.parent / "shared"
LOGO_PATH = ASSETS_DIR / "logo_pens.png"
ERD_PATH = ASSETS_DIR / "erd_cindy_advertising.png"
MOCKUP_PATH = ASSETS_DIR / "mockup_overview.png"
OUT_DOCX = BASE_DIR / "Laporan Proyek Akhir - UMKM Percetakan Kemasan Custom Berbasis Web.docx"
OUT_PDF = BASE_DIR / "Laporan Proyek Akhir - UMKM Percetakan Kemasan Custom Berbasis Web.pdf"
CONVERTER_PS1 = SHARED_DIR / "convert_docx_to_pdf.ps1"


# ==============================================================================
# 1. DIAGRAM GENERATORS (ERD & MOCKUP)
# ==============================================================================

def draw_entity_box(ax, x, y, w, h, title, fields, is_core=False):
    header_color = "#1E3A5F" if is_core else "#475569"
    border_color = "#1E3A5F" if is_core else "#64748B"
    body_bg = "#F8FAFC" if is_core else "#FFFFFF"

    body = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.02,rounding_size=0.12",
        facecolor=body_bg, edgecolor=border_color, linewidth=1.6, zorder=2
    )
    ax.add_patch(body)

    hdr_h = 0.52
    hdr = FancyBboxPatch(
        (x, y + h - hdr_h), w, hdr_h,
        boxstyle="round,pad=0.02,rounding_size=0.10",
        facecolor=header_color, edgecolor=border_color, linewidth=1.2, zorder=3
    )
    ax.add_patch(hdr)

    badge = " [INTI]" if is_core else ""
    ax.text(
        x + w / 2, y + h - hdr_h / 2, f"{title}{badge}",
        ha="center", va="center", color="white",
        fontsize=8.5, fontweight="bold", family="DejaVu Sans", zorder=4
    )

    line_y = y + h - hdr_h - 0.24
    step = (h - hdr_h - 0.28) / max(len(fields), 1)
    for field in fields:
        weight = "bold" if field.startswith("PK ") or field.startswith("FK ") else "normal"
        color = "#0F172A" if weight == "bold" else "#334155"
        ax.text(
            x + 0.14, line_y, field,
            ha="left", va="center", color=color,
            fontsize=7.2, fontweight=weight, family="DejaVu Sans", zorder=4
        )
        line_y -= step


def draw_rel(ax, p1, p2, label, rad=0.0, label_pos=None):
    arrow = FancyArrowPatch(
        p1, p2,
        connectionstyle=f"arc3,rad={rad}",
        arrowstyle="-|>", mutation_scale=11,
        linewidth=1.3, color="#334155", zorder=1
    )
    ax.add_patch(arrow)
    if label_pos is not None:
        mx, my = label_pos
    else:
        mx = (p1[0] + p2[0]) / 2
        my = (p1[1] + p2[1]) / 2 + (0.20 if rad == 0 else 0.0)
    ax.text(
        mx, my, label, ha="center", va="center",
        fontsize=6.9, fontweight="bold", color="#0F172A",
        bbox=dict(boxstyle="round,pad=0.16", facecolor="#FFFFFF", edgecolor="#CBD5E1", linewidth=0.8),
        zorder=5
    )


def generate_erd_image():
    fig, ax = plt.subplots(figsize=(12.5, 7.6), dpi=240)
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 10.2)
    ax.axis("off")

    ax.text(
        8.0, 9.85,
        "Entity Relationship Diagram (ERD) 8 Tabel Basis Data SQLite — Cindy Advertising",
        ha="center", va="center", fontsize=11.5, fontweight="bold", color="#0F172A"
    )
    ax.text(
        8.0, 9.48,
        "Biru Tua: Lapisan Inti Operasional (MVP)   |   Abu Gelap: Lapisan Pendukung Terintegrasi",
        ha="center", va="center", fontsize=8.2, color="#475569"
    )

    # Top row: raw_materials, orders (center big), users
    draw_entity_box(
        ax, 0.4, 5.7, 3.6, 3.2, "raw_materials",
        [
            "PK id",
            "name : string",
            "category : enum (4+1)",
            "stock_qty : int",
            "min_stock : int",
            "unit : string (pcs/lbr)",
            "created_at / updated_at",
        ],
        is_core=False
    )

    draw_entity_box(
        ax, 5.6, 4.9, 4.6, 4.1, "orders",
        [
            "PK id",
            "UQ uuid (publik /track/{uuid})",
            "UQ order_code (ORD-YYMM-XXX)",
            "source : ADMIN | CLIENT_LINK",
            "customer_name, customer_wa",
            "status (6 tahap + CANCELLED)",
            "design_status, revision_count",
            "pickup_method, tracking_number",
            "total_price : int (IDR)",
            "stock_deducted : bool",
            "cancelled_at, refund_amount",
        ],
        is_core=True
    )

    draw_entity_box(
        ax, 11.9, 6.75, 3.7, 2.25, "users",
        [
            "PK id",
            "name : string",
            "UQ email : string",
            "password : hash",
            "role : OWNER | ADMIN",
            "is_active : bool",
        ],
        is_core=False
    )

    draw_entity_box(
        ax, 11.9, 4.35, 3.7, 2.05, "shop_settings",
        [
            "PK id (singleton = 1)",
            "shop_name : string",
            "whatsapp_number : 628xxx",
            "address, maps_url",
            "bank_info : text",
        ],
        is_core=False
    )

    # Bottom row: order_items, order_revisions, order_payments, cash_flows
    draw_entity_box(
        ax, 0.4, 0.6, 3.7, 3.5, "order_items",
        [
            "PK id",
            "FK order_id -> orders",
            "FK raw_material_id (nullable)",
            "category : CUP|PLASTIK|DTF|STIKER",
            "item_name : string",
            "specs : JSON (dinamis)",
            "qty, unit_price, subtotal",
            "logo_url : string (nullable)",
        ],
        is_core=True
    )

    draw_entity_box(
        ax, 4.6, 0.6, 3.4, 2.9, "order_revisions",
        [
            "PK id",
            "FK order_id -> orders",
            "version : int (1, 2, 3...)",
            "mockup_url : string",
            "client_note : text",
            "admin_note : text",
            "UQ (order_id, version)",
        ],
        is_core=False
    )

    draw_entity_box(
        ax, 8.5, 0.6, 3.4, 3.0, "order_payments",
        [
            "PK id",
            "FK order_id -> orders",
            "amount : int (IDR)",
            "payment_method : enum",
            "proof_url : string",
            "note : string",
            "paid_at : datetime",
        ],
        is_core=True
    )

    draw_entity_box(
        ax, 12.4, 0.6, 3.2, 2.8, "cash_flows",
        [
            "PK id",
            "type : INCOME | EXPENSE",
            "category : string",
            "amount : int (IDR)",
            "FK order_payment_id (UQ)",
            "FK order_id (nullable)",
            "description, date",
        ],
        is_core=False
    )

    # Relationships
    draw_rel(ax, (2.2, 5.7), (2.2, 4.12), "1 : N (opsional)")
    draw_rel(ax, (5.6, 5.9), (3.9, 4.12), "1 : N")
    draw_rel(ax, (6.8, 4.9), (6.3, 3.52), "1 : N")
    draw_rel(ax, (8.9, 4.9), (9.9, 3.62), "1 : N")
    draw_rel(ax, (11.9, 2.0), (12.4, 2.0), "1 : 1")
    draw_rel(ax, (10.2, 4.9), (12.8, 3.42), "1 : N (refund)", rad=0.06, label_pos=(11.15, 3.98))

    fig.tight_layout(pad=0.3)
    fig.savefig(ERD_PATH, dpi=240, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def generate_mockup_image():
    fig, ax = plt.subplots(figsize=(12.5, 6.8), dpi=240)
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 9.0)
    ax.axis("off")

    ax.text(
        8.0, 8.7,
        "Rancangan Mockup Antarmuka: Panel Admin Filament (Desktop) & Halaman Publik Client (Mobile)",
        ha="center", va="center", fontsize=11.0, fontweight="bold", color="#0F172A"
    )

    # ---- LEFT: DESKTOP ADMIN FILAMENT ----
    desk = FancyBboxPatch((0.3, 0.5), 10.4, 7.7, boxstyle="round,pad=0.02,rounding_size=0.18",
                          facecolor="#F8FAFC", edgecolor="#334155", linewidth=1.6)
    ax.add_patch(desk)
    # Top bar
    topbar = FancyBboxPatch((0.3, 7.55), 10.4, 0.65, boxstyle="round,pad=0.02,rounding_size=0.12",
                            facecolor="#0F172A", edgecolor="#0F172A", linewidth=1.0)
    ax.add_patch(topbar)
    ax.text(0.65, 7.87, "Cindy Advertising  |  Panel Admin Filament (/admin)",
            ha="left", va="center", color="white", fontsize=8.5, fontweight="bold")
    ax.text(10.4, 7.87, "Role: OWNER (Ibu Diana)", ha="right", va="center", color="#CBD5E1", fontsize=7.5)

    # Sidebar
    sidebar = FancyBboxPatch((0.35, 0.55), 2.15, 6.95, boxstyle="square,pad=0",
                             facecolor="#FFFFFF", edgecolor="#CBD5E1", linewidth=1.0)
    ax.add_patch(sidebar)
    menus = ["Dashboard", "Pesanan (Aktif)", "Stok Bahan", "Arus Kas *", "Pengaturan"]
    for idx, m in enumerate(menus):
        my = 6.95 - idx * 0.72
        bg = "#E2E8F0" if idx == 0 else "#FFFFFF"
        rect = FancyBboxPatch((0.48, my - 0.24), 1.9, 0.48, boxstyle="round,pad=0.02,rounding_size=0.08",
                              facecolor=bg, edgecolor="#CBD5E1" if idx == 0 else "none", linewidth=0.8)
        ax.add_patch(rect)
        ax.text(0.60, my, m, ha="left", va="center", fontsize=7.4,
                fontweight="bold" if idx == 0 else "normal", color="#0F172A")
    ax.text(0.55, 1.0, "* Arus Kas & User\n  khusus OWNER", ha="left", va="center",
            fontsize=6.5, color="#64748B", style="italic")

    # 4 KPI Cards
    kpis = [
        ("Omset Bulan Ini", "Rp 18.450.000", "#1E3A5F"),
        ("Laba Bersih*", "Rp 6.820.000", "#166534"),
        ("Piutang Aktif", "Rp 2.150.000", "#B45309"),
        ("Perlu Tindakan", "4 Pesanan", "#991B1B"),
    ]
    for i, (lbl, val, col) in enumerate(kpis):
        kx = 2.7 + i * 1.95
        card = FancyBboxPatch((kx, 6.25), 1.82, 1.05, boxstyle="round,pad=0.02,rounding_size=0.10",
                              facecolor="#FFFFFF", edgecolor="#CBD5E1", linewidth=1.0)
        ax.add_patch(card)
        ax.text(kx + 0.1, 7.0, lbl, ha="left", va="center", fontsize=6.6, color="#64748B")
        ax.text(kx + 0.1, 6.58, val, ha="left", va="center", fontsize=8.0, fontweight="bold", color=col)

    # Table section: Manajemen Pesanan
    tbl_box = FancyBboxPatch((2.7, 2.75), 7.75, 3.25, boxstyle="round,pad=0.02,rounding_size=0.10",
                             facecolor="#FFFFFF", edgecolor="#CBD5E1", linewidth=1.0)
    ax.add_patch(tbl_box)
    ax.text(2.88, 5.72, "Manajemen Pesanan (OrderResource)  |  Tab: Perlu Review | Antre | Belum Lunas | Selesai",
            ha="left", va="center", fontsize=7.2, fontweight="bold", color="#0F172A")

    # Table headers
    hdr_row = FancyBboxPatch((2.82, 5.12), 7.5, 0.36, boxstyle="square,pad=0",
                             facecolor="#F1F5F9", edgecolor="#CBD5E1", linewidth=0.7)
    ax.add_patch(hdr_row)
    cols_x = [2.9, 4.15, 5.55, 6.85, 8.2, 9.35]
    headers = ["Kode", "Pelanggan", "Layanan", "Tahap", "Bayar", "Aksi Cepat"]
    for cx, htext in zip(cols_x, headers):
        ax.text(cx, 5.30, htext, ha="left", va="center", fontsize=6.8, fontweight="bold", color="#334155")

    rows = [
        ("ORD-2611-014", "Kopi Senja", "Cup 16oz (1000)", "Antre Produksi", "Kurang Rp350rb", "+Bayar | WA"),
        ("ORD-2611-015", "Warung Mbak", "Plastik 20x35", "Tunggu ACC", "Belum Bayar", "+Bayar | Link"),
        ("ORD-2611-016", "Komunitas RT", "DTF Baju (35)", "Siap Diambil", "Lunas", "Selesai | WA"),
        ("ORD-2611-017", "Snack Berkah", "Stiker Vinyl A3", "Pesanan Masuk", "Belum Bayar", "Konfirmasi"),
    ]
    for r_idx, row in enumerate(rows):
        ry = 4.72 - r_idx * 0.52
        ax.plot([2.82, 10.32], [ry - 0.24, ry - 0.24], color="#E2E8F0", linewidth=0.6)
        for cx, val in zip(cols_x, row):
            col = "#0F172A"
            if "Kurang" in val:
                col = "#B45309"
            elif val == "Lunas":
                col = "#166534"
            elif "+Bayar" in val or "Konfirmasi" in val or "Selesai |" in val:
                col = "#1D4ED8"
            ax.text(cx, ry, val, ha="left", va="center", fontsize=6.5, color=col)

    # Bottom mini charts/widgets
    w1 = FancyBboxPatch((2.7, 0.75), 4.7, 1.8, boxstyle="round,pad=0.02,rounding_size=0.10",
                        facecolor="#FFFFFF", edgecolor="#CBD5E1", linewidth=1.0)
    ax.add_patch(w1)
    ax.text(2.88, 2.28, "Grafik Omset vs Pengeluaran vs Laba (6 Bulan)", ha="left", va="center",
            fontsize=7.1, fontweight="bold", color="#0F172A")
    xs = [3.1, 3.8, 4.5, 5.2, 5.9, 6.6, 7.1]
    ys_omset = [1.2, 1.45, 1.35, 1.65, 1.8, 1.95, 2.05]
    ys_laba = [0.95, 1.08, 1.02, 1.22, 1.30, 1.40, 1.48]
    ax.plot(xs, ys_omset, color="#1E3A5F", linewidth=1.8, marker="o", markersize=3)
    ax.plot(xs, ys_laba, color="#166534", linewidth=1.8, marker="s", markersize=3)
    ax.text(7.15, 2.05, "Omset", fontsize=6.2, color="#1E3A5F", va="center")
    ax.text(7.15, 1.48, "Laba", fontsize=6.2, color="#166534", va="center")

    w2 = FancyBboxPatch((7.6, 0.75), 2.85, 1.8, boxstyle="round,pad=0.02,rounding_size=0.10",
                        facecolor="#FFFFFF", edgecolor="#CBD5E1", linewidth=1.0)
    ax.add_patch(w2)
    ax.text(7.75, 2.28, "Peringatan Stok Menipis", ha="left", va="center",
            fontsize=7.1, fontweight="bold", color="#991B1B")
    ax.text(7.75, 1.80, "Cup 16oz Oval: 80 pcs", ha="left", va="center", fontsize=6.7, color="#334155")
    ax.text(7.75, 1.42, "Plastik 20x35: 65 pcs", ha="left", va="center", fontsize=6.7, color="#334155")
    ax.text(7.75, 1.04, "Stiker Vinyl A3+: 18 lbr", ha="left", va="center", fontsize=6.7, color="#334155")

    # ---- RIGHT: MOBILE PUBLIC TRACKING / ORDER ----
    phone = FancyBboxPatch((11.2, 0.5), 4.5, 7.7, boxstyle="round,pad=0.02,rounding_size=0.35",
                           facecolor="#F8FAFC", edgecolor="#0F172A", linewidth=2.2)
    ax.add_patch(phone)
    p_hdr = FancyBboxPatch((11.35, 7.35), 4.2, 0.65, boxstyle="round,pad=0.02,rounding_size=0.14",
                           facecolor="#0F172A", edgecolor="#0F172A", linewidth=1.0)
    ax.add_patch(p_hdr)
    ax.text(13.45, 7.67, "Pelacakan Publik (/track/{uuid})",
            ha="center", va="center", color="white", fontsize=7.8, fontweight="bold")

    ax.text(11.5, 7.05, "Cindy Advertising  |  ORD-2611-014", ha="left", va="center",
            fontsize=7.4, fontweight="bold", color="#0F172A")
    ax.text(11.5, 6.72, "Tanpa Login (Responsif HP & Tablet)", ha="left", va="center",
            fontsize=6.6, color="#64748B")

    # 6-stage progress dots
    stages = ["Masuk", "ACC", "Antre", "Proses", "Siap", "Selesai"]
    for s_i, st in enumerate(stages):
        sx = 11.7 + s_i * 0.70
        done = s_i <= 1
        c = "#1E3A5F" if done else "#CBD5E1"
        ax.scatter([sx], [6.22], s=42, color=c, zorder=4)
        if s_i < 5:
            ax.plot([sx, sx + 0.70], [6.22, 6.22], color="#1E3A5F" if s_i < 1 else "#CBD5E1", linewidth=1.4, zorder=3)
        ax.text(sx, 5.92, st, ha="center", va="center", fontsize=5.8, color="#334155")

    # Mockup preview card
    mcard = FancyBboxPatch((11.45, 3.65), 4.0, 2.0, boxstyle="round,pad=0.02,rounding_size=0.12",
                           facecolor="#FFFFFF", edgecolor="#CBD5E1", linewidth=1.0)
    ax.add_patch(mcard)
    ax.text(11.62, 5.42, "Pratinjau Mockup Desain (v2)", ha="left", va="center",
            fontsize=7.2, fontweight="bold", color="#0F172A")
    img_ph = FancyBboxPatch((11.65, 4.38), 3.6, 0.85, boxstyle="round,pad=0.02,rounding_size=0.08",
                            facecolor="#E2E8F0", edgecolor="#94A3B8", linewidth=0.8)
    ax.add_patch(img_ph)
    ax.text(13.45, 4.80, "[Pratinjau Gambar Mockup Cup / Stiker]", ha="center", va="center",
            fontsize=6.6, color="#475569")

    btn1 = FancyBboxPatch((11.65, 3.82), 1.72, 0.40, boxstyle="round,pad=0.02,rounding_size=0.08",
                          facecolor="#166534", edgecolor="#166534", linewidth=0.8)
    ax.add_patch(btn1)
    ax.text(12.51, 4.02, "Setujui (ACC)", ha="center", va="center", fontsize=6.7, fontweight="bold", color="white")

    btn2 = FancyBboxPatch((13.52, 3.82), 1.72, 0.40, boxstyle="round,pad=0.02,rounding_size=0.08",
                          facecolor="#FFFFFF", edgecolor="#B45309", linewidth=1.0)
    ax.add_patch(btn2)
    ax.text(14.38, 4.02, "Ajukan Revisi", ha="center", va="center", fontsize=6.7, fontweight="bold", color="#B45309")

    # Payment summary card
    pcard = FancyBboxPatch((11.45, 1.55), 4.0, 1.88, boxstyle="round,pad=0.02,rounding_size=0.12",
                           facecolor="#FFFFFF", edgecolor="#CBD5E1", linewidth=1.0)
    ax.add_patch(pcard)
    ax.text(11.62, 3.18, "Ringkasan Tagihan", ha="left", va="center",
            fontsize=7.2, fontweight="bold", color="#0F172A")
    ax.text(11.62, 2.80, "Total Tagihan : Rp 850.000", ha="left", va="center", fontsize=6.8, color="#334155")
    ax.text(11.62, 2.46, "Sudah Dibayar : Rp 500.000", ha="left", va="center", fontsize=6.8, color="#166534")
    ax.text(11.62, 2.12, "Sisa Tagihan  : Rp 350.000", ha="left", va="center", fontsize=6.9, fontweight="bold", color="#B45309")
    ax.text(11.62, 1.76, "Rekening: BCA a.n. Cindy Advertising", ha="left", va="center", fontsize=6.3, color="#64748B")

    # WA Button
    wa_btn = FancyBboxPatch((11.45, 0.80), 4.0, 0.52, boxstyle="round,pad=0.02,rounding_size=0.10",
                            facecolor="#0F172A", edgecolor="#0F172A", linewidth=1.0)
    ax.add_patch(wa_btn)
    ax.text(13.45, 1.06, "Chat Admin Cindy Advertising via WhatsApp",
            ha="center", va="center", fontsize=6.9, fontweight="bold", color="white")

    fig.tight_layout(pad=0.3)
    fig.savefig(MOCKUP_PATH, dpi=240, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ==============================================================================
# 2. DOCX HELPERS (STANDAR LAPORAN RESMI A4, TANPA BINGKAI)
# ==============================================================================

def set_font(run, size=12, bold=False, italic=False, name="Times New Roman", color=(0, 0, 0)):
    run.font.name = name
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = RGBColor(*color)
    rPr = run._r.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.insert(0, rFonts)
    rFonts.set(qn("w:ascii"), name)
    rFonts.set(qn("w:hAnsi"), name)
    rFonts.set(qn("w:cs"), name)


def add_page_number_footer(section):
    footer = section.footer
    footer.is_linked_to_previous = False
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)

    r1 = p.add_run("Halaman ")
    set_font(r1, size=10)

    fld1 = OxmlElement("w:fldChar")
    fld1.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    fld2 = OxmlElement("w:fldChar")
    fld2.set(qn("w:fldCharType"), "separate")
    fld3 = OxmlElement("w:fldChar")
    fld3.set(qn("w:fldCharType"), "end")

    r_pg = p.add_run()
    set_font(r_pg, size=10)
    r_pg._r.append(fld1)
    r_pg._r.append(instr)
    r_pg._r.append(fld2)
    r_pg._r.append(fld3)


def add_chapter_heading(doc, bab_label, title_text, page_break=True):
    p1 = doc.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p1.paragraph_format.page_break_before = page_break
    p1.paragraph_format.space_before = Pt(0)
    p1.paragraph_format.space_after = Pt(2)
    p1.paragraph_format.line_spacing = 1.15
    p1.paragraph_format.keep_with_next = True
    r1 = p1.add_run(bab_label)
    set_font(r1, size=13, bold=True)

    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.paragraph_format.space_before = Pt(0)
    p2.paragraph_format.space_after = Pt(10)
    p2.paragraph_format.line_spacing = 1.15
    p2.paragraph_format.keep_with_next = True
    r2 = p2.add_run(title_text)
    set_font(r2, size=13, bold=True)


def add_subheading(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    set_font(r, size=12, bold=True)


def add_body(doc, text, indent=True, space_after=4):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if indent:
        p.paragraph_format.first_line_indent = Cm(1.0)
    r = p.add_run(text)
    set_font(r, size=11.5)
    return p


def add_numbered_item(doc, number_str, lead_bold, rest_text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.left_indent = Cm(0.8)
    p.paragraph_format.first_line_indent = Cm(-0.5)
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15

    r_num = p.add_run(f"{number_str}. ")
    set_font(r_num, size=11.5, bold=True)
    if lead_bold:
        r_lead = p.add_run(f"{lead_bold} ")
        set_font(r_lead, size=11.5, bold=True)
    r_rest = p.add_run(rest_text)
    set_font(r_rest, size=11.5)


def set_cell_shading(cell, fill_hex):
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading)


def set_table_borders(table, color="94A3B8", sz="4"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:right w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)


def prevent_row_split(row):
    trPr = row._tr.get_or_add_trPr()
    trPr.append(OxmlElement("w:cantSplit"))


def repeat_header_row(row):
    trPr = row._tr.get_or_add_trPr()
    trPr.append(OxmlElement("w:tblHeader"))


def set_cell_margins(cell, top=60, bottom=60, left=100, right=100):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)


def add_styled_table(doc, headers, rows, col_widths_cm=None, font_size=10):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_borders(table, color="64748B", sz="4")

    # Header
    hdr_row = table.rows[0]
    repeat_header_row(hdr_row)
    prevent_row_split(hdr_row)
    for i, h_text in enumerate(headers):
        cell = hdr_row.cells[i]
        if col_widths_cm:
            cell.width = Cm(col_widths_cm[i])
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        set_cell_shading(cell, "E2E8F0")
        set_cell_margins(cell, top=70, bottom=70, left=90, right=90)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.1
        r = p.add_run(h_text)
        set_font(r, size=font_size, bold=True)

    # Data rows
    for r_idx, row_data in enumerate(rows):
        row = table.rows[r_idx + 1]
        prevent_row_split(row)
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            if col_widths_cm:
                cell.width = Cm(col_widths_cm[c_idx])
            cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP
            set_cell_margins(cell, top=55, bottom=55, left=90, right=90)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if (c_idx == 0 and str(val).isdigit()) else WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.12
            r = p.add_run(str(val))
            set_font(r, size=font_size)

    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(4)
    return table


def add_code_box(doc, code_text):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table, color="94A3B8", sz="4")
    row = table.rows[0]
    prevent_row_split(row)
    cell = row.cells[0]
    cell.width = Cm(15.0)
    set_cell_shading(cell, "F8FAFC")
    set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.05
    r = p.add_run(code_text)
    set_font(r, size=8.2, name="Consolas")

    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(4)


def add_figure(doc, image_path, caption_text, width_cm=14.6):
    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(4)
    p_img.paragraph_format.space_after = Pt(2)
    p_img.paragraph_format.keep_with_next = True
    run = p_img.add_run()
    run.add_picture(str(image_path), width=Cm(width_cm))

    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(0)
    p_cap.paragraph_format.space_after = Pt(6)
    r_cap = p_cap.add_run(caption_text)
    set_font(r_cap, size=10, italic=True)


# ==============================================================================
# 3. BUILD REPORT DOCUMENT
# ==============================================================================

def build_docx():
    doc = docx.Document()

    # Standard A4 official report margins (no page border, no personal header)
    sec = doc.sections[0]
    sec.page_width = Cm(21.0)
    sec.page_height = Cm(29.7)
    sec.top_margin = Cm(2.5)
    sec.bottom_margin = Cm(2.5)
    sec.left_margin = Cm(3.2)
    sec.right_margin = Cm(2.5)
    sec.different_first_page_header_footer = True
    add_page_number_footer(sec)

    # Set default Normal style
    normal_style = doc.styles["Normal"]
    normal_style.font.name = "Times New Roman"
    normal_style.font.size = Pt(11.5)
    normal_style.font.color.rgb = RGBColor(0, 0, 0)

    # ==========================================================================
    # COVER PAGE (Mengikuti format cover PENS yang dilampirkan)
    # ==========================================================================
    def add_cover_line(text, size=12, bold=False, space_before=0, space_after=4):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.25
        r = p.add_run(text)
        set_font(r, size=size, bold=bold)

    add_cover_line("PEMROGRAMAN WEB DAN APLIKASI", size=14, bold=True, space_before=10, space_after=4)
    add_cover_line("LAPORAN PROYEK AKHIR", size=14, bold=True, space_before=0, space_after=8)
    add_cover_line("UMKM Percetakan Kemasan Custom Berbasis Web", size=13, bold=True, space_before=0, space_after=24)

    p_logo = doc.add_paragraph()
    p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_logo.paragraph_format.space_before = Pt(10)
    p_logo.paragraph_format.space_after = Pt(28)
    p_logo.add_run().add_picture(str(LOGO_PATH), width=Cm(5.6))

    add_cover_line("Dosen Pengampu :", size=12, bold=True, space_before=6, space_after=2)
    add_cover_line("Afifah Dwi Ramadhani, S.ST., M.Tr.T.", size=12, bold=False, space_before=0, space_after=22)

    add_cover_line("Nama Kelompok :", size=12, bold=True, space_before=4, space_after=4)
    add_cover_line("2424600036 - Muhammad Farrel Setiawan", size=12, bold=False, space_before=0, space_after=2)
    add_cover_line("2424600054 - Fauzan Alwahyu Utomo", size=12, bold=False, space_before=0, space_after=2)
    add_cover_line("2424600058 - Naufal Ridho Athallah", size=12, bold=False, space_before=0, space_after=42)

    add_cover_line("PROGRAM STUDI D4 TEKNOLOGI REKAYASA INTERNET", size=12, bold=True, space_before=16, space_after=2)
    add_cover_line("DEPARTEMEN TEKNIK ELEKTRO", size=12, bold=True, space_before=0, space_after=2)
    add_cover_line("POLITEKNIK ELEKTRONIKA NEGERI SURABAYA", size=12, bold=True, space_before=0, space_after=2)
    add_cover_line("SURABAYA", size=12, bold=True, space_before=0, space_after=2)
    add_cover_line("2026", size=12, bold=True, space_before=0, space_after=0)

    # ==========================================================================
    # BAB I PENDAHULUAN
    # ==========================================================================
    add_chapter_heading(doc, "BAB I", "PENDAHULUAN", page_break=True)

    add_subheading(doc, "1.1 Profil Mitra")
    add_body(
        doc,
        "Mitra yang menjadi objek penggalian kebutuhan dan implementasi pada proyek ini adalah Cindy Advertising, "
        "sebuah usaha mikro, kecil, dan menengah (UMKM) yang bergerak di bidang jasa percetakan kemasan custom dan "
        "sablon di Sidoarjo, Jawa Timur. Usaha ini dikelola langsung oleh pemiliknya, yaitu Ibu Diana dan Bapak Hermanto, "
        "dibantu oleh sekitar empat orang tenaga kerja dalam operasional sehari-hari. Layanan utama yang dikerjakan mencakup "
        "sablon gelas cup minuman, sablon plastik kemasan, sablon DTF untuk berbagai jenis pakaian, serta cetak stiker "
        "dengan variasi bahan dan jenis potongan sesuai pesanan pelanggan."
    )
    add_body(
        doc,
        "Dalam kesehariannya, Cindy Advertising menerima rata-rata empat hingga lima pesanan setiap hari dengan fluktuasi "
        "yang mengikuti permintaan pasar. Meskipun jumlah transaksi harian terlihat ringkas, setiap pesanan umumnya dipesan "
        "dalam kuantitas partai besar untuk kebutuhan pelaku usaha minuman, kuliner, maupun komunitas, sehingga ketepatan "
        "spesifikasi produksi, ketersediaan bahan baku polosan, dan akurasi catatan pembayaran menjadi faktor krusial "
        "bagi keberlangsungan usaha."
    )

    add_subheading(doc, "1.2 Latar Belakang Masalah")
    add_body(
        doc,
        "Hingga saat penggalian informasi dilakukan, seluruh proses administrasi pada Cindy Advertising masih berjalan "
        "secara tradisional tanpa dukungan perangkat lunak. Pesanan masuk dan proses revisi desain masih dicatat secara "
        "terpisah melalui percakapan WhatsApp maupun pembicaraan tatap muka. Pencatatan pembayaran uang muka hingga "
        "pelunasan sepenuhnya bergantung pada lembar nota kertas tulis tangan, sementara ketersediaan stok bahan baku "
        "hanya dicatat secara manual melalui nota terpisah atau pesan singkat internal."
    )
    add_body(
        doc,
        "Pola kerja manual tersebut menimbulkan hambatan nyata dalam operasional harian. Ketika pelanggan datang atau "
        "menghubungi untuk membayar cicilan maupun melunasi sisa tagihan, pengelola harus membongkar dan mencari lembar "
        "nota satu per satu. Aktivitas yang menyita waktu dan terjadi berulang kali tersebut telah menyebabkan kesalahan "
        "penulisan nominal pembayaran pelanggan di nota. Di samping itu, pencatatan stok bahan baku secara manual menyulitkan "
        "pemantauan bahan yang menipis, sedangkan tercampurnya catatan pemasukan dan pengeluaran operasional membuat pemilik "
        "kesulitan mengetahui laba bersih usaha secara cepat dan akurat."
    )

    add_subheading(doc, "1.3 Tujuan Proyek")
    add_body(doc, "Tujuan pelaksanaan proyek pembangunan aplikasi web bagi UMKM Cindy Advertising adalah sebagai berikut:", indent=False, space_after=3)
    add_numbered_item(doc, "1", "Menggali kebutuhan operasional nyata", "melalui wawancara langsung dan observasi alur pencatatan bersama pemilik Cindy Advertising di Sidoarjo.")
    add_numbered_item(doc, "2", "Merumuskan rancangan sistem dan basis data", "yang menerjemahkan permasalahan nota manual, pelacakan pesanan, stok bahan baku, dan rekap keuangan ke dalam arsitektur Laravel 11, Filament v3, Blade/Livewire, dan SQLite.")
    add_numbered_item(doc, "3", "Membangun aplikasi web responsif", "yang nyaman dioperasikan melalui ponsel pintar, tablet, maupun komputer, mencakup panel admin berbasis hak akses (Owner dan Admin) serta halaman pemesanan dan pelacakan publik tanpa login bagi pelanggan.")
    add_numbered_item(doc, "4", "Menguji dan menyempurnakan aplikasi bersama mitra", "pada kunjungan kedua agar seluruh fitur terbukti berjalan sesuai kondisi lapangan dan umpan balik pemilik tertindaklanjuti secara nyata.")

    # ==========================================================================
    # BAB II METODE PENGGALIAN INFORMASI
    # ==========================================================================
    add_chapter_heading(doc, "BAB II", "METODE PENGGALIAN INFORMASI", page_break=True)

    add_subheading(doc, "2.1 Narasumber, Waktu, dan Lokasi Kegiatan")
    add_body(
        doc,
        "Penggalian informasi lapangan dilaksanakan pada tanggal 16 November 2026 bertempat di lokasi usaha Cindy Advertising "
        "di Sidoarjo. Narasumber utama pada kegiatan ini adalah Ibu Diana dan Bapak Hermanto selaku pemilik sekaligus "
        "pengambil keputusan operasional harian. Keterlibatan langsung pemilik memberikan gambaran utuh mulai dari tahap "
        "penerimaan pesanan pelanggan, pengelolaan desain, transaksi pembayaran bertahap, pengadaan bahan baku polosan, "
        "hingga kendala perhitungan laba bersih."
    )

    add_subheading(doc, "2.2 Teknik Pengumpulan Data dan Pembagian Peran Tim")
    add_body(
        doc,
        "Pengumpulan data dilakukan menggunakan dua pendekatan yang saling melengkapi, yaitu wawancara semi terstruktur "
        "dengan daftar pertanyaan terbuka dan observasi langsung terhadap alur pencatatan nota kertas serta komunikasi "
        "pesanan. Sebelum kunjungan, tim menyusun pertanyaan terbuka yang berfokus pada rutinitas pencatatan harian, "
        "titik kendala paling sering muncul, perangkat kerja yang tersedia, serta keluaran informasi yang paling dibutuhkan "
        "pemilik usaha. Pembagian peran kelompok beranggotakan tiga mahasiswa disusun mengikuti pedoman mata kuliah "
        "sebagaimana dirangkum pada Tabel 2.1."
    )

    add_styled_table(
        doc,
        ["NRP", "Nama Mahasiswa", "Peran Pedoman", "Tanggung Jawab Utama"],
        [
            ["2424600054", "Fauzan Alwahyu Utomo", "Koordinator Mitra dan Pengembang Utama (rangkap)", "Penghubung tunggal Cindy Advertising, perizinan dan jadwal kunjungan, setup Laravel 11 + SQLite, migrasi 8 tabel, model, policy RBAC, dan layanan transaksi atomik."],
            ["2424600036", "Muhammad Farrel Setiawan", "Pengembang Antarmuka dan Pengujian", "Pengembangan Filament Resources, Relation Managers, halaman publik Blade/Livewire (/order dan /track/{uuid}), responsivitas HP/tablet/PC, serta memimpin uji coba bersama mitra."],
            ["2424600058", "Naufal Ridho Athallah", "Pencatat Lapangan (dan Kontributor Kode)", "Dokumentasi wawancara dan kebutuhan, penyusunan laporan dan presentasi, serta implementasi Seeder/Factory data contoh, helper WA, validasi spesifikasi 4 layanan, dan Filament Widgets."],
        ],
        col_widths_cm=[2.4, 3.6, 3.5, 5.8],
        font_size=9.5
    )

    add_subheading(doc, "2.3 Etika Penggalian Data Lapangan")
    add_body(
        doc,
        "Seluruh rangkaian wawancara dan observasi dijalankan dengan memegang etika penelitian lapangan. Tim terlebih dahulu "
        "meminta izin kepada Ibu Diana dan Bapak Hermanto sebelum mencatat alur kerja usaha, tidak menjanjikan fitur berbayar "
        "di luar batas waktu empat minggu, serta menjaga kerahasiaan data keuangan dan identitas pelanggan asli milik mitra. "
        "Seluruh data contoh yang digunakan pada basis data demo, tangkapan layar laporan, dan presentasi akademik "
        "sepenuhnya memakai data rekaan yang dianonimkan."
    )

    # ==========================================================================
    # BAB III HASIL LAPANGAN DAN ANALISIS KEBUTUHAN
    # ==========================================================================
    add_chapter_heading(doc, "BAB III", "HASIL LAPANGAN DAN ANALISIS KEBUTUHAN", page_break=True)

    add_subheading(doc, "3.1 Kondisi Operasional Eksisting dan Ringkasan Wawancara")
    add_body(
        doc,
        "Dari hasil pengamatan dan perbincangan bersama Ibu Diana dan Bapak Hermanto pada 16 November 2026, terlihat bahwa "
        "alur pelayanan Cindy Advertising sebenarnya sudah berjalan teratur secara lisan, namun media pencatatannya masih "
        "terpencar di nota kertas dan riwayat percakapan. Ringkasan dialog wawancara yang telah dirapikan disajikan pada "
        "Tabel 3.1."
    )

    add_styled_table(
        doc,
        ["Topik Wawancara", "Ringkasan Temuan dari Pemilik Cindy Advertising"],
        [
            ["Layanan dan skala pesanan harian", "Cindy Advertising mengerjakan sablon DTF baju, gelas cup minuman, plastik kemasan atau sablon, serta cetak stiker dengan dukungan sekitar empat orang tenaga kerja. Pesanan yang datang rata-rata berkisar empat sampai lima pesanan per hari, namun kuantitas dalam sekali pesan umumnya besar dan mengikuti dinamika pasar."],
            ["Alur pencatatan yang berjalan sekarang", "Seluruh pencatatan masih dilakukan secara tradisional tanpa perangkat lunak. Pesanan masuk ditulis sendiri dari pesan masuk atau pembicaraan langsung, revisi desain dibahas lewat chat maupun tatap muka, pembayaran dicatat manual pada lembar nota kertas, dan stok bahan baku dicatat terpisah melalui chat atau tulisan di nota."],
            ["Kendala paling menyulitkan dan kesalahan nyata", "Kesulitan terbesar berada pada pencatatan keuangan dan daftar pesanan berbasis nota. Setiap kali pelanggan membayar cicilan atau melunasi tagihan, pengelola harus mencari nota pelanggan satu per satu. Proses berulang yang memakan waktu ini telah memicu kesalahan penulisan catatan nominal uang pelanggan pada nota. Selain itu, stok bahan baku manual sulit dipantau dan perhitungan laba bersih menjadi rumit karena catatan pemasukan serta pengeluaran tercampur."],
            ["Pengguna aplikasi dan perangkat kerja", "Aplikasi nantinya dipakai oleh pemilik usaha (Owner), admin atau karyawan yang membantu operasional, serta pelanggan secara langsung untuk memesan dan memantau status pesanan. Perangkat yang paling sering dipakai sehari-hari adalah ponsel pintar, namun diharapkan tampilan tetap nyaman dibuka lewat tablet maupun komputer."],
            ["Harapan utama terhadap sistem", "Pemilik menginginkan satu sistem terpadu yang membereskan pencatatan pesanan dan cicilan tanpa perlu mencari nota kertas, memantau stok bahan baku secara rapi, serta menampilkan rekap laba bersih secara jelas dan cepat."],
        ],
        col_widths_cm=[4.2, 11.1],
        font_size=9.5
    )

    add_subheading(doc, "3.2 Analisis Masalah dan Daftar Kebutuhan Prioritas")
    add_body(
        doc,
        "Temuan lapangan menunjukkan empat akar persoalan utama, yaitu ketergantungan pada nota fisik yang memperlambat "
        "pelunasan dan menyebabkan salah tulis nominal, tersebarnya rincian spesifikasi produk dan revisi desain di riwayat "
        "chat, terputusnya catatan stok bahan baku dari antrean produksi, serta tercampurnya pencatatan pemasukan dan "
        "pengeluaran sehingga laba bersih sulit dihitung. Berdasarkan analisis tersebut, tim merumuskan lima kebutuhan "
        "prioritas yang dapat diperiksa langsung keberhasilannya oleh mitra sebagaimana tercantum pada Tabel 3.2."
    )

    add_styled_table(
        doc,
        ["No", "Kebutuhan Prioritas", "Ukuran Keberhasilan untuk Mitra"],
        [
            ["1", "Pencatatan pesanan terpadu untuk empat layanan (Gelas Cup, Plastik, Sablon DTF Baju, dan Stiker) baik melalui input cepat admin maupun formulir mandiri pelanggan tanpa login (/order).", "Pesanan harian beserta spesifikasi detail dan file logo tersimpan terpusat dan dapat dicari dalam hitungan detik dari HP maupun PC."],
            ["2", "Sistem pencatatan pembayaran angka langsung (Payment Ledger) dengan tombol pintas Isi Sisa Tagihan dan kalkulasi otomatis status Belum Bayar, Kurang, atau Lunas.", "Saat pelanggan melunasi utang, pengelola tidak lagi mencari nota kertas; sisa tagihan akurat langsung terlihat dalam satu klik."],
            ["3", "Alur pengerjaan enam tahap, manajemen versi revisi desain, generator pesan WhatsApp, serta halaman pelacakan publik tanpa login (/track/{uuid}).", "Pelanggan dapat melihat progres dan menyetujui desain lewat tautan pribadi, dan tombol revisi otomatis terkunci begitu pesanan masuk antrean produksi."],
            ["4", "Manajemen stok bahan baku terintegrasi dengan pemotongan otomatis satu kali saat masuk Antre Produksi serta fitur restock terhubung pengeluaran kas.", "Stok berkurang akurat sesuai jumlah pesanan yang diproduksi dan peringatan bahan menipis tampil langsung di halaman dashboard."],
            ["5", "Rekap arus kas otomatis, pencatatan pengeluaran, pembatalan aman (soft cancel dan refund), serta laporan laba bersih khusus akun Owner.", "Pemilik dapat memantau omset, piutang aktif, pengeluaran, dan laba bersih periode berjalan langsung dari HP tanpa tercampur, sementara akses karyawan dibatasi."],
        ],
        col_widths_cm=[0.9, 7.6, 6.8],
        font_size=9.5
    )

    add_subheading(doc, "3.3 Batas Lingkup dan Pengembangan Lanjutan")
    add_body(
        doc,
        "Meskipun pedoman umum menyarankan maksimal tiga tabel utama, dosen pengampu memberikan persetujuan penggunaan "
        "delapan tabel serta penyertaan halaman publik tanpa login bagi pelanggan agar seluruh permasalahan nyata Cindy "
        "Advertising terjawab secara menyeluruh. Sebagai batas lingkup yang tegas, sistem dijalankan secara lokal tanpa "
        "layanan berbayar. Fitur di luar lingkup seperti pengiriman WhatsApp otomatis melalui WhatsApp Business API berbayar, "
        "integrasi payment gateway otomatis, cetak nota langsung ke printer termal Bluetooth, serta modul akuntansi pajak "
        "penuh dicatat sebagai rencana pengembangan lanjutan."
    )

    # ==========================================================================
    # BAB IV RANCANGAN SISTEM
    # ==========================================================================
    add_chapter_heading(doc, "BAB IV", "RANCANGAN SISTEM", page_break=True)

    add_subheading(doc, "4.1 Arsitektur Teknologi")
    add_body(
        doc,
        "Sistem dibangun menggunakan arsitektur modular monolith berbasis Laravel 11 dan SQLite dengan pembagian antarmuka "
        "hibrida. Panel internal bagi Owner dan Admin/Karyawan dikembangkan menggunakan Filament v3 karena menyediakan "
        "komponen Resource CRUD, Relation Manager, filter cepat, aksi massal, grafik analitik, dan tata letak responsif "
        "yang langsung nyaman dipakai pada layar ponsel pintar maupun desktop. Sementara itu, halaman publik tanpa login "
        "untuk pemesanan mandiri (/order) dan pelacakan pesanan (/track/{uuid}) dibangun menggunakan Blade, Livewire 3, "
        "dan Tailwind CSS. Seluruh operasi kritis seperti pemotongan stok, sinkronisasi pembayaran ke arus kas, dan "
        "pembatalan dengan refund dibungkus dalam transaksi basis data DB::transaction() agar integritas data tetap terjaga."
    )

    add_subheading(doc, "4.2 Entity Relationship Diagram (ERD) dan Struktur Basis Data")
    add_body(
        doc,
        "Basis data SQLite dirancang terdiri atas delapan tabel yang dikelompokkan ke dalam Lapisan Inti Operasional "
        "(orders, order_items, dan order_payments) serta Lapisan Pendukung Terintegrasi (users, raw_materials, "
        "order_revisions, cash_flows, dan shop_settings). Struktur spesifikasi dinamis keempat layanan termasuk Stiker "
        "(bahan chromo/vinyl/transparan, ukuran atau lembar A3+, potongan kiss-cut/die-cut, dan laminasi glossy/doff) "
        "disimpan pada kolom JSON specs di tabel order_items. Relasi antar entitas ditunjukkan pada Gambar 4.1 dan "
        "diringkas pada Tabel 4.1."
    )

    add_figure(doc, ERD_PATH, "Gambar 4.1 Entity Relationship Diagram (ERD) Delapan Tabel Basis Data Cindy Advertising.", width_cm=15.0)

    add_styled_table(
        doc,
        ["Tabel", "Lapisan", "Fungsi dan Relasi Eloquent Utama"],
        [
            ["orders", "Inti (MVP)", "Menyimpan data pesanan, UUID publik, kode unik, status 6 tahap, status desain, flag stock_deducted, dan data soft cancel. Relasi: hasMany OrderItem, OrderRevision, OrderPayment, dan CashFlow."],
            ["order_items", "Inti (MVP)", "Menyimpan rincian item layanan (CUP, PLASTIK, DTF_BAJU, STIKER, LAINNYA), kolom JSON specs dinamis, kuantitas, harga, dan tautan bahan baku opsional. Relasi: belongsTo Order dan RawMaterial."],
            ["order_payments", "Inti (MVP)", "Mencatat setiap pembayaran bertahap secara angka langsung sebagai pengganti nota kertas. Relasi: belongsTo Order dan hasOne CashFlow."],
            ["raw_materials", "Pendukung", "Menyimpan katalog dan jumlah stok bahan polosan (cup, plastik, kaos, bahan stiker) beserta batas stok minimum. Relasi: hasMany OrderItem."],
            ["order_revisions", "Pendukung", "Menyimpan riwayat versi unggahan mockup desain (v1, v2, v3) beserta catatan pelanggan dan admin. Relasi: belongsTo Order."],
            ["cash_flows", "Pendukung", "Mencatat jurnal pemasukan otomatis dari pembayaran order, pengeluaran operasional/restock, serta refund pembatalan untuk perhitungan laba bersih. Relasi: belongsTo OrderPayment dan Order."],
            ["users", "Pendukung", "Mengelola akun autentikasi Filament dengan pemisahan peran OWNER dan ADMIN melalui Policy RBAC."],
            ["shop_settings", "Pendukung", "Menyimpan konfigurasi tunggal profil Cindy Advertising, nomor WhatsApp resmi, alamat Maps, dan informasi rekening bank."],
        ],
        col_widths_cm=[2.8, 2.2, 10.3],
        font_size=9.2
    )

    add_subheading(doc, "4.3 Pemetaan Fitur ke Materi Modul dan Rancangan Mockup")
    add_body(
        doc,
        "Rancangan fitur aplikasi dipetakan langsung terhadap materi praktikum agar terukur secara akademik. Pembuatan "
        "tabel dan relasi hasMany serta belongsTo mengacu pada Modul 2 dan 3, penyediaan data contoh anonim lintas enam "
        "bulan menggunakan Seeder dan Factory mengacu pada Modul 4, sedangkan manajemen pesanan, bahan baku, arus kas, "
        "Relation Manager, filter status, aksi cepat, dan widget statistik menggunakan Filament v3 mengacu pada Modul 5 dan 6. "
        "Adapun halaman publik /order dan /track/{uuid}, transaksi atomik pemotongan stok idempoten, serta pembatasan hak "
        "akses OWNER dan ADMIN merupakan perluasan yang menjawab kebutuhan mitra. Tampilan rancangan antarmuka desktop "
        "Filament dan tampilan ponsel pintar halaman publik pelanggan ditunjukkan pada Gambar 4.2."
    )

    add_figure(doc, MOCKUP_PATH, "Gambar 4.2 Rancangan Mockup Panel Admin Filament (Desktop) dan Halaman Pelacakan Publik Tanpa Login (Mobile).", width_cm=14.4)

    # ==========================================================================
    # BAB V IMPLEMENTASI
    # ==========================================================================
    add_chapter_heading(doc, "BAB V", "IMPLEMENTASI", page_break=True)

    add_body(
        doc,
        "Catatan Status Progres (Minggu 3): Pada saat penyusunan draft laporan ini, proyek berada pada tahap pembangunan "
        "aplikasi Minggu 3 dengan peralihan stack teknis resmi menuju Laravel 11, Filament v3, Blade/Livewire 3, dan SQLite "
        "sesuai pedoman mata kuliah. Subbab berikut mendokumentasikan arsitektur struktur aplikasi, pola kode inti yang "
        "diterapkan tim, pembagian kontribusi repositori, serta ruang tangkapan layar yang akan dilengkapi segera setelah "
        "seluruh modul selesai diintegrasikan pada akhir Minggu 3."
    )

    add_subheading(doc, "5.1 Struktur Aplikasi Laravel 11 dan Filament v3")
    add_code_box(
        doc,
        "app/\n"
        "  Enums/         -> UserRole, OrderStatus, DesignStatus, ServiceCategory (CUP, PLASTIK, DTF_BAJU, STIKER)\n"
        "  Models/        -> User, RawMaterial, Order, OrderItem, OrderRevision, OrderPayment, CashFlow, ShopSetting\n"
        "  Policies/      -> CashFlowPolicy (OWNER only), UserPolicy (OWNER only), OrderPolicy, RawMaterialPolicy\n"
        "  Services/      -> OrderService, PaymentService, RevisionService, InventoryService, FinanceAnalyticsService\n"
        "  Helpers/       -> WaTemplateHelper (deep link wa.me), FormatterHelper (IDR & 628xxx), FileUploadHelper\n"
        "  Filament/\n"
        "    Resources/   -> OrderResource (+ Items, Revisions, Payments RelationManagers), RawMaterialResource,\n"
        "                    CashFlowResource, UserResource\n"
        "    Pages/       -> ManageShopSettings\n"
        "    Widgets/     -> OverviewStatsWidget, FinanceTrendChart, ServiceProportionChart, LowStockMaterialsWidget\n"
        "  Livewire/Public/ -> PublicOrderForm (/order), OrderTracker (/track/{uuid})\n"
        "  Http/Controllers/-> FileController (validasi MIME JPG/PNG/WEBP <= 2 MB & proteksi path traversal)\n"
        "database/\n"
        "  migrations/    -> 8 tabel inti SQLite   |   factories/ & seeders/ -> data contoh anonim lintas 6 bulan"
    )

    add_subheading(doc, "5.2 Pola Implementasi Logika Transaksi Atomik Inti")
    add_body(
        doc,
        "Dua logika paling kritis untuk menjawab permasalahan Cindy Advertising adalah pencatatan pembayaran bertahap yang "
        "langsung tersinkronisasi ke arus kas tanpa pencarian nota fisik, serta pemotongan stok bahan baku yang bersifat "
        "idempoten (hanya memotong tepat satu kali ketika pesanan masuk status PRODUCTION_QUEUE). Keduanya dijalankan "
        "dalam blok DB::transaction() pada lapisan Service sebagaimana dicontohkan pada cuplikan berikut."
    )

    add_code_box(
        doc,
        "// Contoh pola transaksi atomik pada app/Services/PaymentService.php\n"
        "public function recordPayment(\n"
        "    Order $order, int $amount, PaymentMethod $method, ?string $note = null\n"
        "): OrderPayment {\n"
        "    return DB::transaction(function () use ($order, $amount, $method, $note) {\n"
        "        $payment = $order->payments()->create([\n"
        "            'amount'         => $amount,\n"
        "            'payment_method' => $method,\n"
        "            'note'           => $note,\n"
        "            'paid_at'        => now(),\n"
        "        ]);\n"
        "        CashFlow::create([\n"
        "            'type'             => CashFlowType::INCOME,\n"
        "            'category'         => 'Pembayaran Order',\n"
        "            'amount'           => $amount,\n"
        "            'order_payment_id' => $payment->id,\n"
        "            'order_id'         => $order->id,\n"
        "            'description'      => \"Bayar {$order->order_code} ({$order->customer_name})\",\n"
        "            'date'             => now(),\n"
        "        ]);\n"
        "        return $payment;\n"
        "    });\n"
        "}"
    )

    add_subheading(doc, "5.3 Dokumentasi Tangkapan Layar Implementasi")
    add_body(
        doc,
        "Bagian ini disediakan khusus untuk memuat tangkapan layar aktual setelah pembangunan aplikasi Minggu 3 selesai "
        "dijalankan dengan data contoh anonim dari DatabaseSeeder. Tangkapan layar yang akan disisipkan meliputi halaman "
        "Dashboard Overview Owner pada layar PC dan HP, halaman Manajemen Pesanan beserta modal Quick Payment, halaman "
        "Stok Bahan Baku dan Arus Kas, serta tampilan publik /order dan /track/{uuid} pada ponsel pintar."
    )

    # ==========================================================================
    # BAB VI UJI COBA, UMPAN BALIK MITRA, DAN PERBAIKAN
    # ==========================================================================
    add_chapter_heading(doc, "BAB VI", "UJI COBA, UMPAN BALIK MITRA, DAN PERBAIKAN", page_break=True)

    add_subheading(doc, "6.1 Rencana Skenario Pengujian Bersama Mitra (Kunjungan Kedua Minggu 4)")
    add_body(
        doc,
        "Pengujian aplikasi akan dilakukan secara langsung bersama Ibu Diana, Bapak Hermanto, dan karyawan Cindy Advertising "
        "pada kunjungan kedua di Minggu 4 menggunakan perangkat ponsel pintar dan komputer di lokasi usaha. Sebelum sesi "
        "uji coba lapangan, tim memastikan enam skenario pengujian fungsional dan keamanan pada Tabel 6.1 berjalan tanpa "
        "kendala menggunakan data contoh samaran."
    )

    add_styled_table(
        doc,
        ["No", "Skenario Pengujian Kritis", "Hasil yang Diharapkan", "Status"],
        [
            ["1", "Idempotensi pemotongan stok bahan baku saat status naik ke PRODUCTION_QUEUE lalu IN_PROGRESS.", "Stok terpotong tepat satu kali (stock_deducted = true) dan tidak terpotong ulang pada tahap berikutnya.", "Dijadwalkan Minggu 4"],
            ["2", "Pencatatan pembayaran bertahap (DP lalu tombol Isi Sisa Tagihan) sebagai pengganti nota kertas.", "Status otomatis berubah dari Kurang menjadi Lunas dan seluruh pembayaran muncul otomatis sebagai INCOME di Arus Kas.", "Dijadwalkan Minggu 4"],
            ["3", "Pemesanan mandiri (/order), revisi desain, dan kunci tombol revisi pada /track/{uuid}.", "Pelanggan dapat mengirim pesanan dan ACC desain tanpa login; tombol revisi hilang otomatis setelah masuk antrean produksi.", "Dijadwalkan Minggu 4"],
            ["4", "Pembatalan pesanan (soft cancel) dengan pencatatan refund dan opsi pengembalian stok polosan.", "Order tidak terhapus, pemasukan lama tetap utuh, refund tercatat sebagai EXPENSE, dan laba bersih akurat.", "Dijadwalkan Minggu 4"],
            ["5", "Hak akses berbasis peran (RBAC) antara akun OWNER dan ADMIN pada panel Filament.", "Akun ADMIN tidak melihat menu Arus Kas maupun Manajemen User dan mendapat penolakan akses saat membuka URL langsung.", "Dijadwalkan Minggu 4"],
            ["6", "Keamanan UUID acak, validasi unggahan file, dan responsivitas pada layar HP, tablet, dan PC.", "UUID tidak valid mengembalikan 404, file non-gambar atau di atas 2 MB ditolak, serta antarmuka nyaman di seluruh dimensi layar.", "Dijadwalkan Minggu 4"],
        ],
        col_widths_cm=[0.9, 5.5, 6.2, 2.7],
        font_size=9.2
    )

    add_subheading(doc, "6.2 Catatan Umpan Balik Mitra dan Tindak Lanjut Perbaikan")
    add_body(
        doc,
        "Tabel 6.2 disiapkan untuk mendokumentasikan umpan balik nyata dari pemilik dan karyawan Cindy Advertising saat "
        "mencoba aplikasi pada kunjungan kedua di Minggu 4 beserta bukti perbaikan kode yang dilakukan tim."
    )

    add_styled_table(
        doc,
        ["No", "Umpan Balik Mitra Cindy Advertising", "Tindak Lanjut Perbaikan oleh Tim", "Bukti Verifikasi"],
        [
            ["1", "[Diisi berdasarkan pengamatan dan masukan Ibu Diana / Bapak Hermanto pada kunjungan Minggu 4]", "[Diisi uraian perbaikan kode atau antarmuka yang diterapkan]", "[Commit / Foto]"],
            ["2", "[Diisi berdasarkan uji coba karyawan pada perangkat HP dan komputer]", "[Diisi uraian penyesuaian alur kerja atau tampilan]", "[Commit / Foto]"],
            ["3", "[Diisi berdasarkan evaluasi fitur pencatatan pembayaran dan laporan laba bersih]", "[Diisi uraian penyempurnaan fitur]", "[Commit / Foto]"],
        ],
        col_widths_cm=[0.9, 5.4, 5.9, 3.1],
        font_size=9.2
    )

    # ==========================================================================
    # BAB VII KESIMPULAN, KETERBATASAN, DAN SARAN PENGEMBANGAN LANJUTAN
    # ==========================================================================
    add_chapter_heading(doc, "BAB VII", "KESIMPULAN, KETERBATASAN, DAN SARAN PENGEMBANGAN LANJUTAN", page_break=True)

    add_body(
        doc,
        "Dapat dianalisa bahwa persoalan operasional yang dialami oleh Cindy Advertising di Sidoarjo berakar pada "
        "ketergantungan penuh terhadap pencatatan manual menggunakan nota kertas dan percakapan WhatsApp yang terpencar. "
        "Ketika volume pesanan per transaksi cukup besar dan pembayaran dilakukan secara bertahap, pencarian nota satu per "
        "satu menjadi titik hambat utama yang tidak hanya menyita waktu kerja, tetapi juga memicu kesalahan penulisan nominal "
        "uang pelanggan. Kondisi tersebut diperberat oleh pemantauan stok bahan baku manual dan tercampurnya catatan "
        "keuangan usaha, sehingga pemilik kesulitan memperoleh gambaran laba bersih secara cepat. Melalui perancangan ulang "
        "sistem menggunakan Laravel 11, Filament v3, Blade/Livewire, dan SQLite, seluruh permasalahan tersebut dipetakan ke "
        "dalam satu alur kerja terpusat yang responsif di ponsel pintar, tablet, maupun komputer, sekaligus tetap memenuhi "
        "kebutuhan halaman pemesanan dan pelacakan publik tanpa login bagi pelanggan."
    )
    add_body(
        doc,
        "Dapat disimpulkan bahwa penyusunan dokumen kebutuhan, rancangan delapan tabel basis data, pembagian peran tiga "
        "anggota tim, dan arsitektur aplikasi hibrida telah selaras dengan pedoman proyek mata kuliah maupun kondisi nyata "
        "mitra Cindy Advertising. Pendekatan Payment Ledger angka langsung yang tersinkronisasi otomatis ke jurnal arus kas "
        "dan pemotongan stok bahan baku secara idempoten menjadi solusi inti yang secara langsung menggantikan kelemahan "
        "nota fisik. Pada tahap Minggu 3 berjalan ini, keterbatasan yang masih perlu dituntaskan adalah penyelesaian "
        "implementasi menyeluruh kode Laravel 11 beserta pengisian tangkapan layar aktual serta pelaksanaan kunjungan uji "
        "coba kedua bersama pemilik usaha pada Minggu 4. Untuk pengembangan lanjutan di masa mendatang setelah proyek "
        "selesai, sistem ini berpeluang diperluas melalui integrasi notifikasi WhatsApp otomatis berbasis API resmi, "
        "dukungan pencetakan struk langsung ke printer termal Bluetooth, verifikasi transfer otomatis melalui payment "
        "gateway, serta penyusunan laporan pembukuan akuntansi yang lebih menyeluruh sesuai pertumbuhan skala usaha "
        "Cindy Advertising."
    )

    # ==========================================================================
    # LAMPIRAN
    # ==========================================================================
    add_chapter_heading(doc, "LAMPIRAN", "CATATAN LAPANGAN, DAFTAR PERTANYAAN, DAN BUKTI IZIN", page_break=True)

    add_subheading(doc, "Lampiran A. Catatan Lapangan Wawancara dan Observasi")
    add_body(
        doc,
        "Kunjungan lapangan dilakukan pada tanggal 16 November 2026 di workshop Cindy Advertising, Sidoarjo, bersama "
        "Ibu Diana dan Bapak Hermanto selaku pemilik usaha. Dari hasil pengamatan langsung, usaha percetakan kemasan custom "
        "ini digerakkan oleh sekitar empat orang pekerja dengan layanan utama sablon DTF baju, gelas cup, plastik kemasan, "
        "dan stiker. Rata-rata pesanan harian berkisar empat hingga lima pesanan dengan jumlah unit per transaksi yang besar "
        "mengikuti kondisi pasar. Seluruh alur penerimaan pesanan, diskusi revisi desain, pencatatan pembayaran cicilan, "
        "hingga pengecekan stok bahan baku masih dikelola secara manual memakai nota kertas dan pesan chat. Pemilik "
        "menekankan bahwa pencarian lembar nota satu per satu setiap kali pelanggan melunasi tagihan merupakan pekerjaan "
        "paling merepotkan yang beberapa kali berujung pada salah tulis nominal pembayaran. Selain itu, catatan stok yang "
        "manual dan keuangan yang tercampur membuat perhitungan laba bersih sulit dipantau. Pemilik menyambut baik rencana "
        "pembangunan sistem web terpadu yang mudah dioperasikan melalui ponsel pintar, tablet, maupun komputer, serta "
        "menyediakan akses pemesanan dan pelacakan pesanan tanpa login bagi pelanggan.",
        indent=True, space_after=6
    )

    add_subheading(doc, "Lampiran B. Daftar Pertanyaan Wawancara Terbuka")
    questions = [
        "Produk dan layanan percetakan apa saja yang dikerjakan Cindy Advertising setiap hari, serta berapa rata-rata jumlah pesanan dan tenaga kerja saat ini?",
        "Bagaimana alur pencatatan pesanan masuk mulai dari pelanggan menghubungi hingga pesanan masuk proses pengerjaan?",
        "Bagaimana proses pengelolaan file desain dan revisi dari pelanggan sebelum barang dicetak?",
        "Bagaimana cara mencatat pembayaran uang muka, cicilan, dan pelunasan pelanggan pada saat ini?",
        "Bagian mana dari proses pencatatan pesanan dan pembayaran tersebut yang paling merepotkan atau paling sering menimbulkan kesalahan?",
        "Bagaimana cara memantau ketersediaan stok bahan baku seperti gelas cup, plastik kemasan, kaos polos, dan bahan stiker?",
        "Kendala apa yang paling dirasakan saat melakukan rekap pemasukan, pengeluaran, dan perhitungan laba bersih usaha?",
        "Siapa saja yang nantinya akan menggunakan aplikasi web ini dan perangkat apa yang paling sering dipakai sehari-hari?",
        "Fitur atau informasi apa yang paling ingin Bapak dan Ibu lihat pertama kali ketika membuka aplikasi ini?",
    ]
    for idx, q in enumerate(questions, start=1):
        add_numbered_item(doc, str(idx), "", q)

    p_lampc = doc.add_paragraph()
    p_lampc.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_lampc.paragraph_format.page_break_before = True
    p_lampc.paragraph_format.space_before = Pt(0)
    p_lampc.paragraph_format.space_after = Pt(4)
    p_lampc.paragraph_format.keep_with_next = True
    set_font(p_lampc.add_run("Lampiran C. Bukti Izin Kunjungan dan Penggalian Informasi Mitra"), size=12, bold=True)
    add_body(
        doc,
        "Yang bertanda tangan di bawah ini, selaku pemilik usaha Cindy Advertising di Sidoarjo, menyatakan memberikan izin "
        "kepada kelompok mahasiswa Program Studi D4 Teknologi Rekayasa Internet Politeknik Elektronika Negeri Surabaya "
        "(Muhammad Farrel Setiawan, Fauzan Alwahyu Utomo, dan Naufal Ridho Athallah) untuk melaksanakan wawancara, observasi "
        "alur kerja, perancangan aplikasi web, serta uji coba aplikasi pada lingkungan Cindy Advertising dalam rangka tugas "
        "proyek mata kuliah Pemrograman Web dan Aplikasi. Seluruh data keuangan dan pelanggan asli tetap dijaga "
        "kerahasiaannya dan tidak digunakan sebagai data demo akademik.",
        indent=True, space_after=10
    )

    add_styled_table(
        doc,
        ["Pemilik Mitra Cindy Advertising", "Koordinator Mitra (Mahasiswa)"],
        [
            [
                "Sidoarjo, 16 November 2026\n\n\n( __________________________ )\nIbu Diana / Bapak Hermanto",
                "Sidoarjo, 16 November 2026\n\n\n( __________________________ )\nFauzan Alwahyu Utomo (2424600054)"
            ]
        ],
        col_widths_cm=[7.65, 7.65],
        font_size=10
    )

    doc.save(OUT_DOCX)
    print(f"Saved DOCX: {OUT_DOCX}")


def convert_to_pdf():
    if not CONVERTER_PS1.exists():
        raise FileNotFoundError(f"Converter not found: {CONVERTER_PS1}")
    cmd = [
        "powershell", "-ExecutionPolicy", "Bypass",
        "-File", str(CONVERTER_PS1),
        "-FilePath", str(OUT_DOCX),
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print("STDOUT:", res.stdout)
        print("STDERR:", res.stderr)
        raise RuntimeError(f"PDF conversion failed with exit code {res.returncode}")
    print(f"Saved PDF: {OUT_PDF}")


if __name__ == "__main__":
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    generate_erd_image()
    generate_mockup_image()
    build_docx()
    convert_to_pdf()
