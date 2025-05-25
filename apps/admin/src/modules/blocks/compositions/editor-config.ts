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

	return {
		editorConfig
	}
}
