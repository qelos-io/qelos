import { ref, watch, Ref } from 'vue'

export function useModelChange(modelValue: Ref<any>, list: Ref<any[]>, emit: any) {
  const selected = ref(null)
  watch(
    () => modelValue,
    () => {
      selected.value = list.value.find(item => item._id === modelValue.value)
    })

  return {
    selected,
    change: (item) => {
      selected.value = item
      emit('update:modelValue', item)
    }
  }
}
