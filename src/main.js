/**
 * Функция для расчета выручки
 * @param {Object} purchase - запись о покупке
 * @param {Object} _product - карточка товара (не используется)
 * @returns {number} - выручка от продажи
 */
function calculateSimpleRevenue(purchase, _product) {
    const { sale_price, quantity, discount } = purchase;
    const revenue = sale_price * quantity * (1 - discount / 100);
    return +revenue.toFixed(2);
}

/**
 * Функция для расчета бонусов
 * @param {number} index - порядковый номер в отсортированном массиве
 * @param {number} total - общее число продавцов
 * @param {Object} seller - карточка продавца (должен содержать поле profit)
 * @returns {number} - сумма бонуса в денежных единицах
 */
function calculateBonusByProfit(index, total, seller) {
    const profit = seller.profit || 0;
    if (index === 0) return +(profit * 0.15).toFixed(2);      // 1 место - 15%
    if (index <= 2) return +(profit * 0.10).toFixed(2);       // 2-3 места - 10%
    if (index < total - 1) return +(profit * 0.05).toFixed(2); // Остальные (кроме последнего) - 5%
    return 0;                                                // Последний - 0%
}

/**
 * Функция для анализа данных продаж
 * @param {Object} data - входные данные
 * @param {Object} options - настройки
 * @returns {Array} - массив с результатами анализа
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data || !Array.isArray(data.sellers) || !Array.isArray(data.products) || !Array.isArray(data.purchase_records)) {
        throw new Error("Некорректные входные данные");
    }
    
    // Проверка на пустые массивы
    if (data.sellers.length === 0) throw new Error("Пустой массив sellers");
    if (data.products.length === 0) throw new Error("Пустой массив products");
    if (data.purchase_records.length === 0) throw new Error("Пустой массив purchase_records");

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
        const bonus = calculateBonus(index, sellersStats.length, seller);
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
            bonus: +bonus.toFixed(2)
        };
    });
}