<template>
  <div class="form-row-group">
    <slot/>
  </div>
</template>

<style scoped>
.form-row-group {
  gap: 10px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-end;
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