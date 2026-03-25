import 'dotenv/config';

const STORE = process.env.SHOPIFY_STORE_URL;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = '2025-01';

const REST_BASE = `https://${STORE}/admin/api/${API_VERSION}`;
const GQL_URL = `${REST_BASE}/graphql.json`;

const HEADERS = {
  'X-Shopify-Access-Token': TOKEN,
  'Content-Type': 'application/json',
};

// ── GraphQL helper ────────────────────────────────────────────────────────────
async function gql(query, variables = {}) {
  const res = await fetch(GQL_URL, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify GraphQL ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join(', '));
  return json.data;
}

// ── REST helper ───────────────────────────────────────────────────────────────
async function rest(endpoint) {
  const res = await fetch(`${REST_BASE}/${endpoint}`, { headers: HEADERS });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify REST ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Search products via GraphQL ───────────────────────────────────────────────
export async function searchProducts(query, limit = 4) {
  const count = Math.min(limit || 4, 8);
  const data = await gql(
    `query SearchProducts($q: String!, $n: Int!) {
      products(first: $n, query: $q) {
        edges {
          node {
            id
            title
            description
            handle
            status
            priceRangeV2 {
              minVariantPrice { amount currencyCode }
              maxVariantPrice { amount currencyCode }
            }
            totalInventory
            featuredImage { url altText }
            variants(first: 5) {
              edges {
                node {
                  id
                  title
                  price
                  availableForSale
                  inventoryQuantity
                  selectedOptions { name value }
                }
              }
            }
          }
        }
      }
    }`,
    { q: query, n: count }
  );

  const store = STORE ? STORE.replace('.myshopify.com', '') : 'your-store';

  const products = data.products.edges.map(({ node }) => {
    const variants = node.variants.edges.map((v) => v.node);
    const minPrice = parseFloat(node.priceRangeV2.minVariantPrice.amount).toFixed(2);
    const maxPrice = parseFloat(node.priceRangeV2.maxVariantPrice.amount).toFixed(2);
    const currency = node.priceRangeV2.minVariantPrice.currencyCode;

    // Extract numeric ID from gid://shopify/Product/123456
    const numericId = node.id.replace('gid://shopify/Product/', '');

    return {
      id: numericId,
      title: node.title,
      description: node.description?.slice(0, 200) || '',
      url: `https://${STORE}/products/${node.handle}`,
      price: minPrice === maxPrice ? `${currency} ${minPrice}` : `${currency} ${minPrice} – ${maxPrice}`,
      in_stock: (node.totalInventory ?? 0) > 0,
      total_inventory: node.totalInventory,
      image: node.featuredImage?.url || null,
      variants: variants.map((v) => ({
        title: v.title,
        price: `${currency} ${parseFloat(v.price).toFixed(2)}`,
        available: v.availableForSale,
        inventory: v.inventoryQuantity,
        options: v.selectedOptions,
      })),
    };
  });

  return { products, total: products.length, query };
}

// ── Check a single product's inventory ───────────────────────────────────────
export async function getProductInventory(productId) {
  const data = await gql(
    `query GetProduct($id: ID!) {
      product(id: $id) {
        title
        totalInventory
        variants(first: 20) {
          edges {
            node {
              title
              price
              inventoryQuantity
              availableForSale
              selectedOptions { name value }
            }
          }
        }
      }
    }`,
    { id: `gid://shopify/Product/${productId}` }
  );

  if (!data.product) return { found: false };

  const p = data.product;
  const currency = 'USD'; // update if needed
  return {
    found: true,
    title: p.title,
    total_inventory: p.totalInventory,
    variants: p.variants.edges.map(({ node: v }) => ({
      title: v.title,
      price: `${currency} ${parseFloat(v.price).toFixed(2)}`,
      in_stock: v.availableForSale,
      quantity: v.inventoryQuantity,
      options: v.selectedOptions,
    })),
  };
}

// ── Order status ──────────────────────────────────────────────────────────────
export async function getOrderStatus(orderNumber, email) {
  let endpoint = 'orders.json?status=any&limit=1';

  if (orderNumber) {
    const clean = String(orderNumber).replace('#', '');
    endpoint += `&name=%23${clean}`;
  } else if (email) {
    endpoint += `&email=${encodeURIComponent(email)}`;
  } else {
    return { found: false, reason: 'No order number or email provided' };
  }

  const data = await rest(endpoint);
  const order = data.orders?.[0];

  if (!order) return { found: false, reason: 'Order not found' };

  return {
    found: true,
    order_number: order.name,
    status: order.financial_status,
    fulfillment_status: order.fulfillment_status || 'unfulfilled',
    total: `${order.currency} ${parseFloat(order.total_price).toFixed(2)}`,
    created_at: new Date(order.created_at).toLocaleDateString(),
    line_items: order.line_items?.map((i) => ({
      name: i.name,
      quantity: i.quantity,
    })),
    tracking: order.fulfillments?.[0]?.tracking_url || null,
    shipping_address: order.shipping_address
      ? `${order.shipping_address.city}, ${order.shipping_address.country}`
      : null,
  };
}
