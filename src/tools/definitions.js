// Gemini function declarations format
export const geminiTools = [
  {
    name: 'search_products',
    description:
      'Search the store product catalog. Use this whenever a customer asks about products, ' +
      'wants recommendations, is looking for something specific, or asks about pricing. ' +
      'Pass natural language queries like "BPC-157" or "fat loss peptides".',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query describing what the customer wants',
        },
        limit: {
          type: 'number',
          description: 'Max number of products to return (default 4, max 8)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_order_status',
    description:
      'Look up an order by order number or customer email. Use when a customer asks about ' +
      'their order status, shipping, delivery, or tracking.',
    parameters: {
      type: 'object',
      properties: {
        order_number: {
          type: 'string',
          description: 'Order number (e.g. 1234 or #1234)',
        },
        email: {
          type: 'string',
          description: 'Customer email address',
        },
      },
    },
  },
  {
    name: 'check_product_inventory',
    description:
      'Check detailed inventory and variant information for a specific product by its Shopify product ID. ' +
      'Use after finding a product via search_products when the customer wants to know about specific ' +
      'variants or availability.',
    parameters: {
      type: 'object',
      properties: {
        product_id: {
          type: 'string',
          description: 'Shopify product ID (numeric, from search results)',
        },
      },
      required: ['product_id'],
    },
  },
];
