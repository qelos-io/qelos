---
title: Managing Users
---

# {{ $frontmatter.title }}

This section provides an overview of managing users using the Qelos SDK. The examples demonstrate how to create, update, remove, and retrieve user information, enabling administrators to effectively manage user accounts.

## Creating a User

To create a new user, use the following code:

```bash
await sdkAdmin.users.create({ username: 'newuser', email: 'newuser@example.com', password: 'password' });
```

## Updating a User

To update an existing user's information, use the following code:

```bash
await sdkAdmin.users.update('userId', { email: 'newemail@example.com' });
```

## Removing a User

To remove a user, use the following code:

```bash
await sdkAdmin.users.remove('userId');
```

## Getting a Specific User

To retrieve information about a specific user, use the following code:

```bash
const user = await sdkAdmin.users.getUser('userId');
```

## Getting List of Users

To get a list of all users, use the following code:

```bash
const users = await sdkAdmin.users.getList();
```
