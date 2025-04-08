---
title: Life Cycle Component
editLink: true
---

# {{ $frontmatter.title }}

## Overview

The `<life-cycle>` component provides a visual representation of process or entity lifecycle stages in the Qelos platform. It displays a sequence of steps with their current status, allowing users to track progress through a workflow or process.

## Usage

```html
<life-cycle :stages="lifecycleStages" :current-stage="currentStage"></life-cycle>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `stages` | Array | [] | Array of stage objects defining the lifecycle |
| `currentStage` | String/Number | - | ID or index of the current active stage |
| `direction` | String | 'horizontal' | Direction of the lifecycle display ('horizontal' or 'vertical') |
| `clickable` | Boolean | false | Whether stages can be clicked to navigate |
| `simple` | Boolean | false | Whether to use a simplified display style |
| `size` | String | 'default' | Size of the component ('small', 'default', 'large') |

## Stage Object Properties

Each stage in the `stages` array should be an object with the following properties:

```javascript
{
  id: 'draft',              // Unique identifier for the stage
  name: 'Draft',            // Display name of the stage
  description: '...',       // Optional description of the stage
  icon: 'el-icon-edit',     // Optional icon for the stage
  status: 'completed',      // Status of the stage (completed, active, pending, error)
  timestamp: '2025-04-01'   // Optional timestamp for when the stage was reached
}
```

## Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `stage-click` | (stage: Object, index: Number) | Emitted when a stage is clicked (if clickable) |
| `stage-change` | (newStage: Object, oldStage: Object) | Emitted when the current stage changes |

## Slots

| Slot | Description |
|------|-------------|
| `stage-icon` | Custom content for stage icons |
| `stage-content` | Custom content for stage content |
| `stage-[id]` | Custom content for a specific stage by ID |

## Examples

### Basic Usage

```html
<life-cycle 
  :stages="[
    { id: 'draft', name: 'Draft', status: 'completed', icon: 'el-icon-edit' },
    { id: 'review', name: 'Review', status: 'active', icon: 'el-icon-view' },
    { id: 'approved', name: 'Approved', status: 'pending', icon: 'el-icon-check' },
    { id: 'published', name: 'Published', status: 'pending', icon: 'el-icon-upload' }
  ]"
  current-stage="review"
></life-cycle>
```

### Vertical Direction

```html
<life-cycle 
  :stages="lifecycleStages"
  :current-stage="currentStage"
  direction="vertical"
></life-cycle>
```

### With Timestamps

```html
<life-cycle 
  :stages="[
    { id: 'created', name: 'Created', status: 'completed', timestamp: '2025-04-01 09:30' },
    { id: 'processing', name: 'Processing', status: 'completed', timestamp: '2025-04-02 14:15' },
    { id: 'shipped', name: 'Shipped', status: 'active', timestamp: '2025-04-03 10:45' },
    { id: 'delivered', name: 'Delivered', status: 'pending' }
  ]"
  current-stage="shipped"
></life-cycle>
```

### Clickable Stages

```html
<life-cycle 
  :stages="workflowStages"
  :current-stage="currentWorkflowStage"
  :clickable="true"
  @stage-click="handleStageClick"
></life-cycle>
```

### With Custom Stage Content

```html
<life-cycle :stages="approvalStages" :current-stage="currentApprovalStage">
  <template #stage-review="{ stage }">
    <div class="custom-review-stage">
      <h4>{{ stage.name }}</h4>
      <p>Reviewer: {{ stage.reviewer }}</p>
      <p v-if="stage.comments">Comments: {{ stage.comments }}</p>
    </div>
  </template>
</life-cycle>
```

### In a Content Box

```html
<content-box title="Order Status">
  <life-cycle 
    :stages="orderStages"
    :current-stage="currentOrderStage"
    size="large"
  ></life-cycle>
</content-box>
```

---

u00a9 Velocitech LTD. All rights reserved.
