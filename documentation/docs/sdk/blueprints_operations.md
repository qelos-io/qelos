---
title: Blueprints Operations
---

# {{ $frontmatter.title }}

This section provides an overview of managing blueprints using the Qelos SDK. Blueprints in Qelos represent data models that define the structure of your application's data. The SDK provides methods for creating, updating, removing, and retrieving blueprint information, as well as managing blueprint entities.

## Fetching Blueprints as a Regular User

### Get List of All Blueprints

To get a list of all blueprints:

```typescript
const blueprints = await sdk.blueprints.getList();
```

### Get a Specific Blueprint by Key

To retrieve a specific blueprint by its key:

```typescript
const specificBlueprint = await sdk.blueprints.getBlueprint('blueprint_key');
```

## Working with Blueprint Entities

The Qelos SDK provides a powerful way to work with blueprint entities through the `entitiesOf` method. This method returns an instance of `QlBlueprintEntities` that provides CRUD operations for the entities of a specific blueprint.

### Accessing Blueprint Entities

To access the entities of a specific blueprint:

```typescript
const productEntities = sdk.blueprints.entitiesOf('product');
```

The `entitiesOf` method returns a `QlBlueprintEntities` instance that provides the following methods:

### Getting a List of Entities

To retrieve a list of entities for a blueprint:

```typescript
const products = await productEntities.getList();
```

You can also pass query parameters to filter, sort, or paginate the results:

```typescript
const filteredProducts = await productEntities.getList({
  $limit: 10,
  $skip: 0,
  $sort: 'created',
  $flat: true,
  $populate: true,
  my_custom_property: 'value',
  "my_custom_numeric_property[$lt]": 10,
  "my_custom_numeric_property[$gt]": 5,
});
```

To run a metadata search, pass `$q` (the search string) and `$qProps` (comma-separated metadata keys) through `getList`:

```typescript
const matchingProducts = await productEntities.getList({
  $q: 'Premium',
  $qProps: 'name,description',
  $limit: 20,
  $sort: '-created',
  'metadata.category': 'electronics',
  price: { $lt: 500 },
  $outerPopulate: 'relatedOrders:orders:workspace'
});
```

### Getting a Specific Entity

To retrieve a specific entity by its identifier:

```typescript
const product = await productEntities.getEntity('product_id');
```

### Creating a New Entity

To create a new entity:

```typescript
const newProduct = await productEntities.create({
  name: 'New Product',
  price: 99.99,
  category: 'electronics'
});
```

### Updating an Entity

To update an existing entity:

```typescript
const updatedProduct = await productEntities.update('product_id', {
  price: 89.99,
  inStock: true
});
```

### Removing an Entity

To remove an entity:

```typescript
await productEntities.remove('product_id');
```

## Type Safety with TypeScript

When using TypeScript, you can provide a type parameter to `entitiesOf` for better type safety:

```typescript
interface Product {
  _id: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

const productEntities = sdk.blueprints.entitiesOf<Product>('product');

// Now all operations will be type-safe
const products = await productEntities.getList();
// products is of type Product[]

const newProduct = await productEntities.create({
  name: 'New Product',
  price: 99.99,
  category: 'electronics',
  inStock: true
});
// newProduct is of type Product
```

## Blueprint Charts & Metrics

Blueprints expose ready-made analytics endpoints that return ECharts-compatible payloads for dashboards.

### Available Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/blueprints/:blueprintIdentifier/charts/:chartType` | Returns a standard chart (line, bar, etc.). Requires the `x` query param with the metadata key to aggregate. |
| `GET` | `/api/blueprints/:blueprintIdentifier/charts/pie` | Returns a pie chart configuration. Also expects the `x` query param. |
| `GET` | `/api/blueprints/:blueprintIdentifier/charts/count` | Returns a numeric count for entities matching the supplied filters. |
| `GET` | `/api/blueprints/:blueprintIdentifier/charts/sum` | Returns sum values grouped by a property. Requires `sum` query param, `groupBy` is optional. |

All endpoints honor the same query parameters that blueprint entity listing supports (`$limit`, `$skip`, filters, etc.) and automatically enforce the caller's permission scopes.

### Using the SDK

```typescript
// Aggregated line / bar chart
const chartOption = await sdk.blueprints.getChart('products', 'line', {
  x: 'status',
  $limit: 0
});

// Pie chart
const pieOption = await sdk.blueprints.getPieChart('products', {
  x: 'category'
});

// Count metric (e.g., KPI cards)
const totalProducts = await sdk.blueprints.getCount('products', {
  published: true
});

// Sum values grouped by a property
const salesByRegion = await sdk.blueprints.getSum('orders', 'amount', 'region', {
  status: 'completed',
  'metadata.orderDate[$gte]': '2024-01-01'
});
// Returns: { groups: [{ group: 'North', sum: 15000 }, { group: 'South', sum: 12000 }], sum: 27000 }

// Total sum without grouping
const totalSales = await sdk.blueprints.getSum('orders', 'amount', undefined, {
  status: 'completed',
  'metadata.orderDate[$gte]': '2024-01-01'
});
// Returns: { sum: 27000 }
```

Each call returns an object ready to pass directly into `<v-chart>`'s `option` prop or to display as a numeric metric.

### Sum Endpoint Details

The `getSum` method allows you to calculate the sum of a numeric property grouped by another property. This is useful for creating reports like "total sales by region" or "revenue by product category".

#### Parameters

- `blueprintKey` (string): The identifier of the blueprint
- `sumProperty` (string): The numeric property to sum (must be of type number)
- `groupByProperty` (optional string): The property to group by (string, number, boolean, date, datetime, or time). If not provided, returns a single total sum.
- `query` (optional): Additional filters to apply to the data

#### Response Format

When `groupByProperty` is provided:
```typescript
{
  groups: Array<{
    group: any;  // The grouped value
    sum: number; // The sum for this group
  }>;
  sum: number; // Grand total across all groups
}
```

When `groupByProperty` is omitted:
```typescript
{
  sum: number; // Total sum across all matching entities
}
```

#### Examples

```typescript
// Total sales by region
const salesByRegion = await sdk.blueprints.getSum('orders', 'amount', 'region');

// Total revenue by product category (with filters)
const revenueByCategory = await sdk.blueprints.getSum('orders', 'total', 'category', {
  status: 'completed',
  'metadata.date[$gte]': '2024-01-01',
  'metadata.date[$lte]': '2024-12-31'
});

// Total sales amount (no grouping)
const totalSales = await sdk.blueprints.getSum('orders', 'amount', undefined, {
  status: 'completed'
});

// Average order value per customer (using count for division)
const [orderSum, orderCount] = await Promise.all([
  sdk.blueprints.getSum('orders', 'amount', 'customerId'),
  sdk.blueprints.getCount('orders')
]);

// Calculate average
const averageOrderValue = orderSum.sum / orderCount.count;
```

#### Grouping Behavior

- **String/Number/Boolean**: Groups by exact values
- **Date/Datetime**: Groups by day of week (0=Sunday, 6=Saturday)
- **Time**: Groups by hour of day (0-23)
- **Object properties**: Not supported for grouping

## Managing Blueprints as an Administrator

**Note**: Administrative blueprint management is only available through the administrator SDK (`QelosAdminSDK`).

### Getting List of Blueprints

To get a list of all blueprints as an administrator:

```typescript
const blueprints = await sdkAdmin.manageBlueprints.getList();
```

### Getting a Specific Blueprint

To get a specific blueprint by its key as an administrator:

```typescript
const blueprint = await sdkAdmin.manageBlueprints.getBlueprint('blueprintKey');
```

### Creating a Blueprint

To create a new blueprint:

```typescript
const newBlueprint = await sdkAdmin.manageBlueprints.create({ 
  key: 'product',
  name: 'Product',
  description: 'Product catalog blueprint',
  fields: [
    {
      key: 'name',
      type: 'string',
      required: true
    },
    {
      key: 'price',
      type: 'number',
      required: true
    },
    {
      key: 'category',
      type: 'string',
      required: false
    }
  ]
});
```

### Updating a Blueprint

To update an existing blueprint's information:

```typescript
await sdkAdmin.manageBlueprints.update('blueprintKey', { 
  name: 'Updated Product',
  description: 'Updated product catalog blueprint'
});
```

### Removing a Blueprint

To remove a blueprint:

```typescript
await sdkAdmin.manageBlueprints.remove('blueprintKey');
```

## Complete Admin Example

Here's a complete example of managing blueprints as an administrator:

```typescript
import QelosAdminSDK from '@qelos/sdk/dist/administrator';

// Initialize the admin SDK
const sdkAdmin = new QelosAdminSDK({
  appUrl: 'https://your-qelos-app.com',
  fetch: globalThis.fetch
});

// Authenticate as admin
await sdkAdmin.authentication.oAuthSignin({
  username: 'admin@example.com',
  password: 'password'
});

// Get all blueprints
const blueprints = await sdkAdmin.manageBlueprints.getList();
console.log(`Found ${blueprints.length} blueprints`);

// Create a new blueprint
const newBlueprint = await sdkAdmin.manageBlueprints.create({
  key: 'article',
  name: 'Article',
  description: 'Blog article blueprint',
  fields: [
    { key: 'title', type: 'string', required: true },
    { key: 'content', type: 'text', required: true },
    { key: 'author', type: 'string', required: true },
    { key: 'publishedAt', type: 'date', required: false }
  ]
});

console.log(`Created blueprint: ${newBlueprint.key}`);

// Update the blueprint
await sdkAdmin.manageBlueprints.update('article', {
  description: 'Enhanced blog article blueprint with tags',
  fields: [
    { key: 'title', type: 'string', required: true },
    { key: 'content', type: 'text', required: true },
    { key: 'author', type: 'string', required: true },
    { key: 'publishedAt', type: 'date', required: false },
    { key: 'tags', type: 'array', required: false }
  ]
});

// Get specific blueprint
const blueprint = await sdkAdmin.manageBlueprints.getBlueprint('article');
console.log(`Blueprint: ${blueprint.name}`);

// Remove the blueprint
await sdkAdmin.manageBlueprints.remove('article');
console.log('Blueprint removed');
```
