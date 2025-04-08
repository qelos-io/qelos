---
title: PubSub Events System
editLink: true
---

# {{ $frontmatter.title }}

## Overview

The Qelos Admin frontend includes a PubSub (Publish-Subscribe) service that allows components to communicate with each other through a publish-subscribe pattern. This system is particularly useful for cross-component communication in custom templates and components.

The PubSub service is implemented as a singleton, ensuring that all components share the same instance and can communicate with each other effectively.

## Using PubSub in Vue Templates

The PubSub system is available in all Vue templates through the global `pubsub` object. You don't need to import it manually in your templates.

### Template Examples

Here are examples of how to use PubSub events in your templates:

#### Publishing Events

```html
<!-- Publishing an event on button click -->
<el-button @click="pubsub.publish('workspaces:activateSilently', 'workspace123')">
  Activate Workspace by ID
</el-button>

<!-- Publishing an event with object data -->
<el-button @click="pubsub.publish('workspaces:activate', { _id: 'workspace123', name: 'My Workspace' })">
  Activate Workspace
</el-button>

<!-- Publishing with async/await -->
<el-button @click="async () => {
  await pubsub.publish('workspaces:activateSilently', { _id: 'workspace123', name: 'My Workspace' });
  $message.success('Workspace activated!');
}">
  Activate and Wait
</el-button>
```

#### Displaying Data from Subscriptions

```html
<!-- Displaying workspace data received from subscription -->
<div class="workspace-info">
  <h2>Current Workspace: {{ currentWorkspace?.name || 'None' }}</h2>
  <p v-if="currentWorkspace">ID: {{ currentWorkspace._id }}</p>
</div>
```

#### Conditional Rendering Based on Events

```html
<!-- Showing different content based on event data -->
<div>
  <el-alert
    v-if="notification"
    :title="notification"
    type="info"
    :closable="true"
    @close="notification = null"
  />
  
  <el-empty v-if="!currentWorkspace" description="No workspace selected">
    <el-button @click="pubsub.publish('workspaces:showSelector', true)">
      Select Workspace
    </el-button>
  </el-empty>
</div>
```

## Best Practices

1. **Use Namespaced Event Names**: To avoid conflicts, use namespaced event names like `module:action` (e.g., `workspaces:activate`).

2. **Clean Up Subscriptions**: Always unsubscribe from events when components are unmounted to prevent memory leaks.

3. **Handle Asynchronous Operations**: When publishing events that trigger asynchronous operations, use `await` to ensure all operations complete before proceeding.

   ```html
   <el-button @click="async () => {
     // Wait for all subscribers to complete
     await pubsub.publish('data:refresh', { force: true });
     // Then proceed with next action
     showSuccessMessage();
   }">
     Refresh Data
   </el-button>
   ```

## Available Events

The following events are available for use in your custom templates:

### Workspace Events

| Event Name | Description | Parameters | Return Value |
|------------|-------------|------------|-------------|
| `workspaces:activate` | Activates a workspace | `workspace: IWorkspace` | Promise that resolves when activation is complete |
| `workspaces:activateSilently` | Silently activates a workspace by ID | `workspaceId: string` | Promise that resolves when activation is complete |

## Communication Between Templates

Here's how you can use PubSub to communicate between different templates in your Qelos application:

### Sender Template (Publishing Events)

```html
<!-- This could be in a dashboard template -->
<div>
  <h2>Workspace Selector</h2>
  <el-select v-model="selectedWorkspace" placeholder="Select Workspace">
    <el-option
      v-for="workspace in workspaces"
      :key="workspace._id"
      :label="workspace.name"
      :value="workspace"
    />
  </el-select>
  
  <el-button 
    type="primary" 
    @click="pubsub.publish('workspaces:activate', selectedWorkspace)" 
    :disabled="!selectedWorkspace"
  >
    Set Active Workspace
  </el-button>
</div>
```

### Receiver Template (Displaying Events)

```html
<!-- This could be in a header template -->
<div class="workspace-header">
  <h3 v-if="currentWorkspace">
    <i class="fas fa-building"></i>
    Current Workspace: {{ currentWorkspace.name }}
  </h3>
  <h3 v-else>No Workspace Selected</h3>
</div>
```

## Custom Events for Templates

You can define your own custom events for communication between your template components. Just make sure to use namespaced event names to avoid conflicts with system events.

Here's how you might use custom events in your templates:

### Publishing Custom Events

```html
<!-- Form Template -->
<div>
  <el-form @submit.prevent="saveAndNotify">
    <el-form-item label="Title">
      <el-input v-model="formData.title" />
    </el-form-item>
    <el-form-item label="Description">
      <el-input type="textarea" v-model="formData.description" />
    </el-form-item>
    <el-button type="primary" native-type="submit">Save</el-button>
  </el-form>
</div>
```

### Displaying Notifications from Events

```html
<!-- Dashboard Template -->
<div>
  <el-alert
    v-if="notification"
    :title="notification"
    type="info"
    :closable="true"
    @close="notification = null"
  />
  
  <!-- Rest of dashboard content -->
</div>
```

---

© Velocitech LTD. All rights reserved.
