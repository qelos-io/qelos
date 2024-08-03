---
title: Blueprints Operations
---

# {{ $frontmatter.title }}

This section provides an overview of managing blueprints using the Qelos SDK. The examples demonstrate how to create, update, remove, and retrieve blueprint information, enabling administrators to effectively manage blueprints.

---

# Fetching Blueprints Regular User

## Get List of All Blueprints

To get a list of all blueprints, use the following code:

```bash
const blueprints = await sdk.blueprints.getList();
```

## Get a Specific Blueprint by Name

```bash
const specificBlueprint = await sdk.blueprints.getBlueprint('blueprint_name');
```

---

# Managing Blueprints Administrator

## Creating a Blueprint

To create a new blueprint, use the following code:

```bash
await sdkAdmin.manageBlueprints.create({ name: 'New Blueprint', description: 'Description of the blueprint' });
```

## Updating a Blueprint

To update an existing blueprint's information, use the following code:

```bash
await sdkAdmin.manageBlueprints.update('blueprintId', { name: 'Updated Name' });
```

## Removing a Blueprint

To remove a blueprint, use the following code:

```bash
await sdkAdmin.manageBlueprints.remove('blueprintId');
```

## Getting List of Blueprints

To get a list of all blueprints, use the following code:

```bash
const blueprints = await sdkAdmin.manageBlueprints.getList();
```

## Getting a Specific Blueprint

To get a specific blueprint by its ID, use the following code:

```bash
const blueprint = await sdkAdmin.manageBlueprints.getBlueprint('blueprintId');
```
