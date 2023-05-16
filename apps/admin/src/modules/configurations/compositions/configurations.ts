import {useDispatcher} from '../../core/compositions/dispatcher';
import configurationsService from '../../../services/configurations-service';
import {resetConfiguration} from '@/modules/configurations/store/app-configuration';

const APP_CONFIG_KEY = 'app-configuration';

export function useConfigurationsList() {
  const {result} = useDispatcher(() => configurationsService.getAll())
  return {
    list: result
  }
}

function loadAppConfig() {
  return configurationsService.getOne(APP_CONFIG_KEY)
    .then((config) => {
      config.metadata = {
        ...config.metadata,
        homeScreen: config.metadata.homeScreen || '',
        themeStylesUrl: config.metadata.themeStylesUrl || '',
        colorsPalette: {
          mainColor: '#84a98c',
          textColor: '#000',
          secondaryColor: '#84a98c',
          thirdColor: '#c6dccc',
          negativeColor: '#fff',
          bgColor: '#2f3e46',
          bordersColor: '#354f52',
          inputsTextColor: '#000',
          inputsBgColor: '#d6eedd',
          linksColor: '#84a98c',
          navigationBgColor: '#354f52',
          ...config.metadata.colorsPalette,
        },
      }
      return config;
    })
}

export function useConfiguration(key: string) {
  const {result} = useDispatcher(APP_CONFIG_KEY ? loadAppConfig : () => configurationsService.getOne(key))
  return {
    config: result
  }
}

export function useEditConfiguration(key: string) {
  return {
    ...useConfiguration(key),
    updateConfiguration: async (payload) => {
      await configurationsService.update(key, payload)
      await resetConfiguration();
    }
  }
}
