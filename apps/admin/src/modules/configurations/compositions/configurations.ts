import { useDispatcher } from '../../core/compositions/dispatcher';
import configurationsService from '../../../services/configurations-service';
import { resetConfiguration } from '@/modules/configurations/store/app-configuration';

export function useConfigurationsList() {
  const { result, retry } = useDispatcher(() => configurationsService.getAll())
  return {
    list: result,
    retry
  }
}

export function useConfiguration(key: string) {
  const { result } = useDispatcher(() => configurationsService.getOne(key));
  return {
    config: result,
  };
}

export function useEditConfiguration(key: string) {
  return {
    ...useConfiguration(key),
    updateConfiguration: async (payload) => {
      await configurationsService.update(key, payload);
      await resetConfiguration();
    },
  };
}
