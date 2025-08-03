/**
 * Функция для расчета выручки
 * @param {Object} purchase - запись о покупке
 * @param {Object} _product - карточка товара (не используется)
 * @returns {number} - выручка от продажи
 */
function calculateSimpleRevenue(purchase, _product) {
    const { sale_price, quantity, discount } = purchase;
    const revenue = sale_price * quantity * (1 - discount / 100);
    return Math.round(revenue * 100) / 100;
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
    if (index === 0) return Math.round(profit * 0.15 * 100) / 100;      // 1 место - 15%
    if (index <= 2) return Math.round(profit * 0.10 * 100) / 100;       // 2-3 места - 10%
    if (index < total - 1) return Math.round(profit * 0.05 * 100) / 100; // Остальные (кроме последнего) - 5%
    return 0;                                                          // Последний - 0%
}

/**
 * Функция для анализа данных продаж
 * @param {Object} data - входные данные
 * @param {Object} options - настройки
 * @returns {Array} - массив с результатами анализа
 */
function analyzeSalesData(data, options) {
    // Проверка структуры данных
    if (!data || !Array.isArray(data.sellers) || !Array.isArray(data.products) || !Array.isArray(data.purchase_records)) {
        throw new Error("Некорректные входные данные");
    }
    
    // Проверка на пустые массивы
    if (data.sellers.length === 0) throw new Error("Пустой массив sellers");
    if (data.products.length === 0) throw new Error("Пустой массив products"); 
    if (data.purchase_records.length === 0) throw new Error("Пустой массив purchase_records");

    // Проверка опций
    if (!options || typeof options.calculateRevenue !== 'function' || typeof options.calculateBonus !== 'function') {
        throw new Error("Не переданы необходимые функции для расчетов");
    }

    const { calculateRevenue, calculateBonus } = options;

    // Подготовка данных
    const sellersStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Создание индексов
    const sellersMap = new Map(sellersStats.map(s => [s.id, s]));
    const productsMap = new Map(data.products.map(p => [p.sku, p]));

    // Обработка продаж с точным округлением
    data.purchase_records.forEach(record => {
        const seller = sellersMap.get(record.seller_id);
        if (!seller) return;

        seller.sales_count += 1;

        record.items.forEach(item => {
            const product = productsMap.get(item.sku);
            if (!product) return;

            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            const profit = revenue - cost;

            seller.revenue = Math.round((seller.revenue + revenue) * 100) / 100;
            seller.profit = Math.round((seller.profit + profit) * 100) / 100;
            
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    // Сортировка по прибыли
    sellersStats.sort((a, b) => b.profit - a.profit);

    // Формирование результата
    return sellersStats.map((seller, index) => {
        const bonus = calculateBonus(index, sellersStats.length, seller);
        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        return {
            seller_id: seller.id,
            name: seller.name,
            revenue: seller.revenue,
            profit: seller.profit,
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: bonus
        };
    });
}