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
const productEntities = sdk.blueprints.entitiesOf('products');
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

const productEntities = sdk.blueprints.entitiesOf<Product>('products');

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

## Managing Blueprints as an Administrator

### Creating a Blueprint

To create a new blueprint:

```typescript
await sdkAdmin.manageBlueprints.create({ 
  name: 'New Blueprint', 
  description: 'Description of the blueprint' 
});
```

### Updating a Blueprint

To update an existing blueprint's information:

```typescript
await sdkAdmin.manageBlueprints.update('blueprintId', { 
  name: 'Updated Name' 
});
```

### Removing a Blueprint

To remove a blueprint:

```typescript
await sdkAdmin.manageBlueprints.remove('blueprintId');
```

### Getting List of Blueprints

To get a list of all blueprints as an administrator:

```typescript
const blueprints = await sdkAdmin.manageBlueprints.getList();
```

### Getting a Specific Blueprint

To get a specific blueprint by its ID as an administrator:

```typescript
const blueprint = await sdkAdmin.manageBlueprints.getBlueprint('blueprintId');
```
