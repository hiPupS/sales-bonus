/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { sale_price, quantity, discount } = purchase;
    const revenue = sale_price * quantity * (1 - discount / 100);
    return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) return 0.15;         // 1 место - 15%
    if (index <= 2) return 0.10;          // 2-3 места - 10%
    if (index < total - 1) return 0.05;   // Все кроме последнего - 5%
    return 0;                             // Последний - 0%
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data || !Array.isArray(data.sellers) || !Array.isArray(data.products) || !Array.isArray(data.purchase_records)) {
        throw new Error("Некорректные входные данные");
    }

    // Проверка наличия опций
    if (!options || typeof options.calculateRevenue !== 'function' || typeof options.calculateBonus !== 'function') {
        throw new Error("Не переданы необходимые функции для расчетов");
    }

    const { calculateRevenue, calculateBonus } = options;

    // Подготовка промежуточных данных
    const sellersStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Индексация для быстрого доступа
    const sellersMap = new Map(sellersStats.map(s => [s.id, s]));
    const productsMap = new Map(data.products.map(p => [p.sku, p]));

    // Расчет выручки и прибыли
    data.purchase_records.forEach(record => {
        const seller = sellersMap.get(record.seller_id);
        if (!seller) return;

        seller.sales_count += 1;
        seller.revenue += record.total_amount;

        record.items.forEach(item => {
            const product = productsMap.get(item.sku);
            if (!product) return;

            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            const profit = revenue - cost;

            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Сортировка продавцов по прибыли
    sellersStats.sort((a, b) => b.profit - a.profit);

    // Назначение премий и подготовка результата
    return sellersStats.map((seller, index) => {
        const bonusPercent = calculateBonus(index, sellersStats.length, seller);
        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        return {
            seller_id: seller.id,
            name: seller.name,
            revenue: +seller.revenue.toFixed(2),
            profit: +seller.profit.toFixed(2),
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: +(seller.profit * bonusPercent).toFixed(2)
        };
    });
}