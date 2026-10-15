import { computed, ref, watch } from 'vue';
import { useEditorComponents, type EditorComponent } from './editor-components';

const FAVORITES_KEY = 'qelos:add-component:favorites';

function loadFavorites(): string[] {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export interface CatalogEntry {
  key: string;
  descriptor: EditorComponent;
}

/** the components that can be added to a page, with search, a category filter and favorites */
export function useComponentCatalog() {
  const { availableComponents, getColumnsFromBlueprint } = useEditorComponents();
  const query = ref('');
  const category = ref<'all' | string>('all');
  const favorites = ref<string[]>(loadFavorites());

  watch(
    favorites,
    (value) => {
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(value));
      } catch {
        /* favorites are a convenience */
      }
    },
    { deep: true },
  );

  const entries = computed<CatalogEntry[]>(() => Object.entries(availableComponents.value).map(([key, descriptor]) => ({ key, descriptor })));
  const categories = computed(() => ['all', ...new Set(entries.value.map((e) => e.descriptor.category).filter(Boolean) as string[])]);

  const displayed = computed(() => {
    const q = query.value.trim().toLowerCase();
    return entries.value
      .filter((entry) => {
        const d = entry.descriptor;
        const matches = !q || [d.title, d.description, entry.key, ...(d.tags || [])].some((field) => field?.toLowerCase().includes(q));
        return matches && (category.value === 'all' || d.category === category.value);
      })
      .sort((a, b) => {
        const fav = Number(favorites.value.includes(b.key)) - Number(favorites.value.includes(a.key));
        return fav || (a.descriptor.title || a.key).localeCompare(b.descriptor.title || b.key);
      });
  });

  const isFavorite = (key: string) => favorites.value.includes(key);
  const toggleFavorite = (key: string) => {
    favorites.value = isFavorite(key) ? favorites.value.filter((k) => k !== key) : [...favorites.value, key];
  };

  return { availableComponents, getColumnsFromBlueprint, query, category, categories, displayed, favorites, isFavorite, toggleFavorite };
}
