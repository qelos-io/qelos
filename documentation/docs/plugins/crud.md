---
title: CRUD
editLink: true
---

# {{ $frontmatter.title }}

The ability to easily create a fully operated CRUD, that will dynamically generate the UI in QELOS.

## Basic Example

```typescript
import {createCrud} from '@qelos/plugin-play';
import {ResponseError} from './response-error';

createCrud({
  display: {
    name: 'todo'
  },
  verify: (req, reply) => {
    if (!req.user.roles.includes('paying_customer')) {
      throw new ResponseError('please pay first');
    }
  },
  readOne: (_id, { user }) => todos.findOne({_id, user: user._id}),
  createOne: async (body, { user }) => {
    const data = {...body, user: user._id};
    const res = await todos.insertOne(data);
    data._id = res.insertedId;
    return data;
  },
  readMany: (query) => todos.find({user: user._id, title: new RegExp(query.q, 'i')}).toArray(),
  updateOne: (_id, body, { user }) => todos.updateOne({_id, user: user._id}, { $set: body}),
  deleteOne: (_id, { user }) => todos.deleteOne({_id, user: user._id})
})
```

