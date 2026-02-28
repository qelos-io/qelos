<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuth } from './compositions/authentication';

const authStore = useAuth();

authStore.logout();
const router = useRouter();

router.push('/login');
</script>