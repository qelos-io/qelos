<template>
  <form @submit.prevent="search">
    <label>
      <el-icon><icon-search/></el-icon>
      <input type="text" :placeholder="$t('Search')" class="search-input">
    </label>
  </form>
</template>

<script lang="ts" setup>
function search(event) {
  //
}
</script>

<style scoped>
form {
  flex: 1;
}

label {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  margin: 10px;
  font-size: var(--large-font-size);
}

.el-icon {
  color: var(--main-color);
}

.search-input {
  height: 60px;
  border: none;
  outline: none;
  padding: 10px;
}

.search-input::placeholder {
  color: var(--main-color);
  padding-inline-start: 5px;
}

</style>
