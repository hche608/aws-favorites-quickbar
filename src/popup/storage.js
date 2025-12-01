// Popup storage utilities

export async function loadUserFavorites() {
  try {
    const result = await browser.storage.sync.get(['userFavorites']);
    return result.userFavorites || [];
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error loading favorites', error);
    throw error;
  }
}

export async function saveUserFavorites(favorites) {
  try {
    await browser.storage.sync.set({ userFavorites: favorites });
    console.log('AWS Favorites Quickbar: Favorites saved', favorites);
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error saving favorites', error);
    throw error;
  }
}

export async function addFavorite(serviceId) {
  try {
    const favorites = await loadUserFavorites();
    
    const exists = favorites.some(id => 
      id.toLowerCase() === serviceId.toLowerCase()
    );
    
    if (!exists) {
      favorites.push(serviceId);
      await saveUserFavorites(favorites);
    }
    
    return favorites;
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error adding favorite', error);
    throw error;
  }
}

export async function removeFavorite(serviceId) {
  try {
    const favorites = await loadUserFavorites();
    
    const updated = favorites.filter(id => 
      id.toLowerCase() !== serviceId.toLowerCase()
    );
    
    await saveUserFavorites(updated);
    return updated;
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error removing favorite', error);
    throw error;
  }
}

export async function loadCachedServices() {
  try {
    const result = await browser.storage.local.get(['cachedServices']);
    
    if (!result.cachedServices) {
      console.log('AWS Favorites Quickbar: No cached services found');
      return {};
    }
    
    const data = result.cachedServices;
    const services = data.services || [];
    
    const serviceMap = {};
    services.forEach(service => {
      serviceMap[service.id.toLowerCase()] = service;
    });
    
    console.log('AWS Favorites Quickbar: Loaded cached services:', Object.keys(serviceMap).length);
    return serviceMap;
  } catch (error) {
    console.warn('AWS Favorites Quickbar: Error loading cached services', error);
    return {};
  }
}

export async function loadMaxServices() {
  try {
    const result = await browser.storage.sync.get(['maxServices']);
    return result.maxServices || 10;
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error loading maxServices', error);
    return 10;
  }
}

export async function saveMaxServices(value) {
  try {
    await browser.storage.sync.set({ maxServices: value });
    console.log('AWS Favorites Quickbar: Saved maxServices:', value);
  } catch (error) {
    console.error('AWS Favorites Quickbar: Error saving maxServices', error);
    throw error;
  }
}
