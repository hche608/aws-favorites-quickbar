// Search and filter services

export function searchServices(query, allServices) {
  if (!query || query.trim() === '') {
    return allServices;
  }
  
  const lowerQuery = query.toLowerCase().trim();
  return allServices.filter(service =>
    service.name.toLowerCase().includes(lowerQuery) ||
    service.id.toLowerCase().includes(lowerQuery) ||
    (service.description && service.description.toLowerCase().includes(lowerQuery))
  );
}
