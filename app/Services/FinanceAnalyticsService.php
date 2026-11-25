<?php

namespace App\Services;

use App\Enums\CashFlowType;
use App\Enums\DesignStatus;
use App\Enums\OrderStatus;
use App\Enums\ServiceCategory;
use App\Models\CashFlow;
use App\Models\Order;
use App\Models\OrderItem;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

class FinanceAnalyticsService
{
    /**
     * Summary KPIs for Dashboard Overview & Finance page.
     *
     * @return array{income: int, expense: int, net_profit: int, active_receivables: int, needs_action_count: int}
     */
    public function summary(?CarbonInterface $from = null, ?CarbonInterface $to = null): array
    {
        $cashQuery = CashFlow::query();
        if ($from !== null) {
            $cashQuery->where('date', '>=', $from);
        }
        if ($to !== null) {
            $cashQuery->where('date', '<=', $to);
        }

        $income = (int) (clone $cashQuery)->where('type', CashFlowType::INCOME)->sum('amount');
        $expense = (int) (clone $cashQuery)->where('type', CashFlowType::EXPENSE)->sum('amount');

        $activeOrders = Order::query()
            ->withSum('payments', 'amount')
            ->whereNotIn('status', [OrderStatus::PENDING_REVIEW, OrderStatus::CANCELLED])
            ->get();

        $activeReceivables = (int) $activeOrders->sum(function (Order $order): int {
            $paid = (int) ($order->payments_sum_amount ?? 0);

            return max(0, $order->total_price - $paid);
        });

        $needsActionCount = Order::query()
            ->where(function ($q): void {
                $q->where('status', OrderStatus::PENDING_REVIEW)
                    ->orWhere('design_status', DesignStatus::REVISION_REQUESTED);
            })
            ->where('status', '!=', OrderStatus::CANCELLED)
            ->count();

        return [
            'income' => $income,
            'expense' => $expense,
            'net_profit' => $income - $expense,
            'active_receivables' => $activeReceivables,
            'needs_action_count' => $needsActionCount,
        ];
    }

    /**
     * 6-month trend series for Filament ChartWidget (Omset vs Pengeluaran vs Laba Bersih).
     *
     * @return array{labels: array<int, string>, income: array<int, int>, expense: array<int, int>, net_profit: array<int, int>}
     */
    public function monthlyTrend(int $months = 6): array
    {
        $labels = [];
        $incomes = [];
        $expenses = [];
        $netProfits = [];

        $startMonth = Carbon::now()->startOfMonth()->subMonths($months - 1);

        for ($i = 0; $i < $months; $i++) {
            $monthStart = $startMonth->copy()->addMonths($i)->startOfMonth();
            $monthEnd = $monthStart->copy()->endOfMonth();

            $income = (int) CashFlow::query()
                ->where('type', CashFlowType::INCOME)
                ->whereBetween('date', [$monthStart, $monthEnd])
                ->sum('amount');

            $expense = (int) CashFlow::query()
                ->where('type', CashFlowType::EXPENSE)
                ->whereBetween('date', [$monthStart, $monthEnd])
                ->sum('amount');

            $labels[] = $monthStart->translatedFormat('M Y');
            $incomes[] = $income;
            $expenses[] = $expense;
            $netProfits[] = $income - $expense;
        }

        return [
            'labels' => $labels,
            'income' => $incomes,
            'expense' => $expenses,
            'net_profit' => $netProfits,
        ];
    }

    /**
     * Order item proportion across Cindy Advertising's service categories.
     *
     * @return array<string, array{label: string, item_count: int, total_revenue: int}>
     */
    public function serviceProportion(): array
    {
        $rows = OrderItem::query()
            ->whereHas('order', fn ($q) => $q->whereNotIn('status', [OrderStatus::PENDING_REVIEW, OrderStatus::CANCELLED]))
            ->selectRaw('category, COUNT(*) as item_count, COALESCE(SUM(subtotal), 0) as total_revenue')
            ->groupBy('category')
            ->get()
            ->keyBy(fn ($row) => $row->category instanceof ServiceCategory ? $row->category->value : (string) $row->category);

        $result = [];
        foreach (ServiceCategory::cases() as $category) {
            $row = $rows->get($category->value);
            $result[$category->value] = [
                'label' => $category->label(),
                'item_count' => $row ? (int) $row->item_count : 0,
                'total_revenue' => $row ? (int) $row->total_revenue : 0,
            ];
        }

        return $result;
    }
}
