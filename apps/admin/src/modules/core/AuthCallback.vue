<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { ref } from 'vue';

const route = useRoute();
const router = useRouter();
const response = ref('');

async function convertRefreshToken(refreshToken: string, returnUrl: string) {
	try {
		const res = await fetch(`/api/auth/callback?rt=${refreshToken}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			credentials: 'include',
		});

		if (res.ok) {
			// After a successful request, redirect to returnUrl
			await router.push(returnUrl || '/');
		} else {
			response.value = 'Error processing refresh token';
		}
	} catch (error) {
		response.value = `Error: ${error.message}`;
	}
}

// Get parameters from query
const refreshToken = route.query.rt as string || '';
const returnUrl = route.query.returnUrl as string || '/';

if (refreshToken) {
	// Token conversion
	convertRefreshToken(refreshToken, returnUrl);
} else {
	response.value = 'No refresh token found';
}
</script>

<template>
	<div>
		<p v-if="response">{{ response }}</p>
		<p v-else>Processing...</p>
	</div>
</template>
