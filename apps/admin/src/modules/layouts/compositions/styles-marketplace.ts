import {useDispatcher} from '@/modules/core/compositions/dispatcher';

export interface IStyleProduct {
  name: string,
  description: string,
  'thumbnails': string[],
  'creator': {
    name: string,
    email: string,
    website: string
  }
}

export function useStylesMarketplace() {
  const {
    result: styles,
    retry
  } = useDispatcher<IStyleProduct[]>(() => [], [])

  return {
    styles,
    retry,
  }
}
