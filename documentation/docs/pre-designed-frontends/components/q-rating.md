---
title: Q Rating
editLink: true
---

# Q Rating

A rating component that allows users to select and display ratings with customizable stars and interactive behavior.

## Usage

```html
<q-rating 
  v-model="rating"
  :max="5"
  @change="handleRatingChange"
></q-rating>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| modelValue | number | 0 | Current rating value (v-model) |
| max | number | 5 | Maximum rating value |
| readonly | boolean | false | Whether rating is read-only |
| disabled | boolean | false | Whether rating is disabled |
| size | 'small' \| 'medium' \| 'large' | 'medium' | Star size |
| color | string | '#F7BA2A' | Star color |
| voidColor | string | '#C6D1DE' | Color for empty stars |
| showScore | boolean | true | Whether to show numeric score |
| allowHalf | boolean | false | Whether to allow half-star ratings |
| texts | string[] | [] | Custom labels for each rating level |
| clearable | boolean | false | Whether clicking current rating clears it |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| change | rating | Emitted when rating changes |
| update:modelValue | rating | Emitted when rating updates (v-model) |

## Features

- **Interactive Stars**: Click or hover to select rating
- **Half Ratings**: Optional support for half-star increments
| **Custom Labels**: Add descriptive text for each rating level |
| **Visual Feedback**: Hover effects and transitions |
| **Multiple Sizes**: Small, medium, and large variants |
| **Score Display**: Optional numeric score display |

## Examples

### Basic Rating

```html
<script setup>
const rating = ref(0)

function handleRatingChange(newRating) {
  console.log('New rating:', newRating)
}
</script>

<template>
  <q-rating 
    v-model="rating"
    @change="handleRatingChange"
  />
</template>
```

### With Custom Labels

```html
<q-rating 
  v-model="productRating"
  :max="5"
  :texts="['Terrible', 'Bad', 'Average', 'Good', 'Excellent']"
  show-score
/>
```

### Half Star Ratings

```html
<q-rating 
  v-model="preciseRating"
  :allow-half="true"
  :max="10"
  show-score
/>
```

### Read-only Display

```html
<q-rating 
  :model-value="4.5"
  readonly
  :allow-half="true"
  size="large"
/>
```

### Custom Colors

```html
<q-rating 
  v-model="rating"
  color="#ff6b6b"
  void-color="#e9ecef"
  size="large"
/>
```

### Clearable Rating

```html
<q-rating 
  v-model="userRating"
  clearable
  @change="saveRating"
/>
```

### In Product Review

```html
<div class="product-review">
  <h3>Rate this product</h3>
  <q-rating 
    v-model="review.rating"
    :max="5"
    :texts="['Poor', 'Fair', 'Good', 'Very Good', 'Excellent']"
    size="large"
  />
  <el-input 
    v-model="review.comment"
    type="textarea"
    placeholder="Write your review..."
    class="mt-4"
  />
  <el-button 
    type="primary" 
    @click="submitReview"
    class="mt-4"
  >
    Submit Review
  </el-button>
</div>
```

---

© Velocitech LTD. All rights reserved.
