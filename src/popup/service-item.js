// Service item DOM builder

export function createServiceItem(service, isSelected, isDraggable, handlers) {
  const item = document.createElement('div');
  item.className = 'service-item';
  item.dataset.serviceId = service.id;
  
  if (isSelected) {
    item.classList.add('selected');
  }
  
  if (isDraggable) {
    item.draggable = true;
    item.addEventListener('dragstart', handlers.onDragStart);
    item.addEventListener('dragend', handlers.onDragEnd);
    item.addEventListener('dragover', handlers.onDragOver);
    item.addEventListener('drop', handlers.onDrop);
    item.addEventListener('dragenter', handlers.onDragEnter);
    item.addEventListener('dragleave', handlers.onDragLeave);
  }
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = isSelected;
  checkbox.dataset.serviceId = service.id;
  
  const iconImg = document.createElement('img');
  iconImg.className = 'service-icon';
  iconImg.style.width = '20px';
  iconImg.style.height = '20px';
  iconImg.style.marginRight = '8px';
  iconImg.style.marginLeft = '8px';
  iconImg.style.objectFit = 'contain';
  
  if (service.iconUrl) {
    iconImg.src = service.iconUrl;
  } else {
    iconImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect width="20" height="20" fill="%23232F3E"/></svg>';
  }
  
  iconImg.alt = service.name;
  iconImg.onerror = function() {
    this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect width="20" height="20" fill="%23232F3E"/></svg>';
    this.onerror = null;
  };
  
  const nameSpan = document.createElement('span');
  nameSpan.className = 'service-name';
  nameSpan.textContent = service.name;
  
  item.appendChild(checkbox);
  item.appendChild(iconImg);
  item.appendChild(nameSpan);
  
  item.addEventListener('click', (e) => handlers.onClick(e, service.id));
  checkbox.addEventListener('click', (e) => {
    e.stopPropagation();
    handlers.onClick(e, service.id);
  });
  
  return item;
}
