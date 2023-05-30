import { computed, watch, ref } from 'vue'
import { useAppConfiguration } from '../../configurations/store/app-configuration'

export function useEditorConfig() {
	const {appConfig} = useAppConfiguration()
	const editorConfig = ref({ language: 'en-gb' })

	const language = computed(() => {
		const lang = appConfig.value.language;
		if(!lang || lang === 'en') {
			return 'en-gb';
		}
		return lang
	})

	watch(language, async language => {
		await import(`../../../../node_modules/@greenpress/gp-editor/translations/${language}.js`).catch(() => {
		})
		editorConfig.value = { language }
	}, { immediate: true })

	return {
		editorConfig
	}
}
