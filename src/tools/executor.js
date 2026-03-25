import { searchProducts, getProductInventory, getOrderStatus } from '../services/shopify.js';

export async function executeTool(name, input) {
  try {
    switch (name) {
      case 'search_products':
        return await searchProducts(input.query, input.limit);

      case 'get_order_status':
        return await getOrderStatus(input.order_number, input.email);

      case 'check_product_inventory':
        return await getProductInventory(input.product_id);

      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    console.error(`Tool ${name} error:`, err.message);
    return { error: err.message };
  }
}
