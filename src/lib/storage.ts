import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn('AsyncStorage getItem error:', e);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('AsyncStorage setItem error:', e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('AsyncStorage removeItem error:', e);
    }
  },

  async multiRemove(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (e) {
      console.warn('AsyncStorage multiRemove error:', e);
    }
  },

  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    try {
      return (await AsyncStorage.multiGet(keys)) as [string, string | null][];
    } catch (e) {
      console.warn('AsyncStorage multiGet error:', e);
      return keys.map((k) => [k, null]);
    }
  },
};
