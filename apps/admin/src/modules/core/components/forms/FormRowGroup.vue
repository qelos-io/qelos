<template>
  <div class="form-row-group flex-row-column">
    <slot/>
  </div>
</template>

<style scoped>
.form-row-group {
  gap: 10px;
  justify-content: space-between;
  align-items: flex-end;
}
@media (max-width: 600px) {
  .form-row-group {
    align-items: stretch;
  }
}

.form-row-group[wrap] {
  flex-wrap: wrap;
}

.form-row-group[align-start] {
  justify-content: flex-start;
}

.form-row-group[align-center] {
  align-items: center;
}

.form-row-group > * {
  flex: 1;
}

.form-row-group > ::v-deep(.flex-0) {
  flex: 0;
}

</style>