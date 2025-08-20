import { defineStore } from "pinia";
import { ref } from "vue";
import { isAdmin } from "@/modules/core/store/auth";

export const useAdminAssistantStore = defineStore('adminAssistant', () => {

  const isAdminUser = isAdmin;
  
  const isOpen = ref(false);

  const toggle = () => {
    if (!isAdminUser.value) {
      return;
    }
    isOpen.value = !isOpen.value;
  };

  return {
    isOpen,
    toggle
  }
});
