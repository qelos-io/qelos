<script setup lang="ts">
import { ref } from 'vue';

const tableData = ref([
  {
    date: '2016-05-01',
    name: 'Tom',
    state: 'California',
    city: 'Los Angeles',
    address: 'No. 189, Grove St, Los Angeles',
    zip: 'CA 90036',
  },
  {
    date: '2016-05-02',
    name: 'Tom',
    state: 'California',
    city: 'Los Angeles',
    address: 'No. 189, Grove St, Los Angeles',
    zip: 'CA 90036',
  },
  {
    date: '2016-05-03',
    name: 'Tom',
    state: 'California',
    city: 'Los Angeles',
    address: 'No. 189, Grove St, Los Angeles',
    zip: 'CA 90036',
  },
])

const deleteRow = (index: number) => {
  tableData.value.splice(index, 1)
}
</script>

<template>
  <el-table :data="tableData" style="width: 100%" max-height="250">
    <el-table-column prop="date" label="Date" width="150"/>
    <el-table-column prop="name" label="Name" width="120"/>
    <el-table-column prop="state" label="State" width="120"/>
    <el-table-column prop="city" label="City" width="120"/>
    <el-table-column prop="address" label="Address" />
    <el-table-column label="Operations">
      <template #default="scope">
        <el-button
            link
            type="primary"
            size="small"
            @click.prevent="deleteRow(scope.$index)"
        >
          Remove
        </el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.el-table {
  --el-bg-color: transparent;
  --el-table-bg-color: transparent;
}
</style>