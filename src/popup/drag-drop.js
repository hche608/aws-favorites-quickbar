// Drag and drop handlers

let draggedElement = null;

export function handleDragStart(event) {
  draggedElement = event.currentTarget;
  draggedElement.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/html', draggedElement.innerHTML);
}

export function handleDragEnd(event) {
  if (draggedElement) {
    draggedElement.classList.remove('dragging');
  }
  
  const items = document.querySelectorAll('.service-item');
  items.forEach(item => item.classList.remove('drag-over'));
  
  draggedElement = null;
}

export function handleDragOver(event) {
  if (event.preventDefault) {
    event.preventDefault();
  }
  event.dataTransfer.dropEffect = 'move';
  return false;
}

export function handleDragEnter(event) {
  const target = event.currentTarget;
  if (target !== draggedElement && target.classList.contains('selected')) {
    target.classList.add('drag-over');
  }
}

export function handleDragLeave(event) {
  const target = event.currentTarget;
  target.classList.remove('drag-over');
}

export function createDropHandler(currentFavorites, saveCallback, renderCallback, errorCallback) {
  return async function handleDrop(event) {
    if (event.stopPropagation) {
      event.stopPropagation();
    }
    
    const target = event.currentTarget;
    
    if (draggedElement && target !== draggedElement && target.classList.contains('selected')) {
      const draggedId = draggedElement.dataset.serviceId;
      const targetId = target.dataset.serviceId;
      
      const draggedIndex = currentFavorites.findIndex(id => 
        id.toLowerCase() === draggedId.toLowerCase()
      );
      const targetIndex = currentFavorites.findIndex(id => 
        id.toLowerCase() === targetId.toLowerCase()
      );
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const originalOrder = [...currentFavorites];
        
        const [removed] = currentFavorites.splice(draggedIndex, 1);
        currentFavorites.splice(targetIndex, 0, removed);
        
        console.log('AWS Favorites Quickbar: Reordered favorites', currentFavorites);
        
        try {
          await saveCallback(currentFavorites);
          renderCallback();
          
          // Notify tabs
          const tabs = await chrome.tabs.query({ url: 'https://*.console.aws.amazon.com/*' });
          for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { action: 'updateQuickbar' }).catch(() => {});
          }
        } catch (error) {
          console.error('AWS Favorites Quickbar: Error saving reordered favorites', error);
          currentFavorites.splice(0, currentFavorites.length, ...originalOrder);
          renderCallback();
          errorCallback('Failed to save new order. Please try again.');
        }
      }
    }
    
    return false;
  };
}
