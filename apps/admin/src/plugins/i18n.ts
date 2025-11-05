import { createI18n } from 'vue-i18n'

// @ts-ignore
import en from '../i18n/en.json'

export const i18n = createI18n({
	legacy: false,
	globalInjection: true,
	locale: 'en',
	warnHtmlInMessage: false,
	silentTranslationWarn: true,
	missing: (lang, key) => {
		return key
	},
	messages: { en }
})

const loadedLanguages: string[] = []
const languageChangeCallbacks: Map<Function, Map<string, Record<string, string>>> = new Map();


const setI18nLanguage = (lang) => {
	i18n.global.locale.value = lang
	return lang
}

export const loadLanguageAsync = async (lang = 'en') => {
	if (i18n.global.locale.value === lang) {
		return Promise.resolve(setI18nLanguage(lang))
	}

	if (loadedLanguages.includes(lang)) {
		return Promise.resolve(setI18nLanguage(lang))
	}
	await import(`../i18n/${lang}.json`).then((messages) => {
		i18n.global.setLocaleMessage(lang, messages.default)
		loadedLanguages.push(lang)
		return setI18nLanguage(lang)
	})

  languageChangeCallbacks.forEach(async (callbackMap, callback) => {
		if (callbackMap.has(lang)) {
      i18n.global.mergeLocaleMessage(lang, callbackMap.get(lang));
		} else {
			try {
        const messages = await callback(lang)
        callbackMap.set(lang, messages)
        i18n.global.mergeLocaleMessage(lang, messages)
      } catch (error) {
        console.error(error)
      }
		}
  })
}

export const translate = (key: string, params: any = null): string => {
	return i18n.global.t(key, params) as string || key
}

export function onLanguageChange(callback: (lang: string) => void) {
	languageChangeCallbacks.set(callback, new Map());
}