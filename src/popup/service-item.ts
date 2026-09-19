/**
 * Service item DOM builder
 *
 * This module provides functionality for creating service item DOM elements
 * for the popup interface.
 */

import { Service, PLACEHOLDER_ICON_URL } from '../types';
import { resolveServiceIcon } from '../services/service-icons';

/**
 * Event handlers for service item interactions
 */
export interface ServiceItemHandlers {
  /** Handler for click events on the service item */
  onClick: (event: Event, serviceId: string) => void;
  /** Handler for drag start events */
  onDragStart?: (event: DragEvent) => void;
  /** Handler for drag end events */
  onDragEnd?: (event: DragEvent) => void;
  /** Handler for drag over events */
  onDragOver?: (event: DragEvent) => void;
  /** Handler for drop events */
  onDrop?: (event: DragEvent) => void;
  /** Handler for drag enter events */
  onDragEnter?: (event: DragEvent) => void;
  /** Handler for drag leave events */
  onDragLeave?: (event: DragEvent) => void;
}

/**
 * Creates a service item DOM element
 * @param service - Service data
 * @param isSelected - Whether the service is currently selected/favorited
 * @param isDraggable - Whether the item should be draggable
 * @param handlers - Event handlers for the service item
 * @returns HTMLElement representing the service item
 */
export function createServiceItem(
  service: Service,
  isSelected: boolean,
  isDraggable: boolean,
  handlers: ServiceItemHandlers
): HTMLElement {
  const item = document.createElement('div');
  item.className = 'service-item';
  item.dataset.serviceId = service.id;

  if (isSelected) {
    item.classList.add('selected');
  }

  if (isDraggable) {
    item.draggable = true;
    if (handlers.onDragStart) {
      item.addEventListener('dragstart', handlers.onDragStart);
    }
    if (handlers.onDragEnd) {
      item.addEventListener('dragend', handlers.onDragEnd);
    }
    if (handlers.onDragOver) {
      item.addEventListener('dragover', handlers.onDragOver);
    }
    if (handlers.onDrop) {
      item.addEventListener('drop', handlers.onDrop);
    }
    if (handlers.onDragEnter) {
      item.addEventListener('dragenter', handlers.onDragEnter);
    }
    if (handlers.onDragLeave) {
      item.addEventListener('dragleave', handlers.onDragLeave);
    }
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

  const iconUrl = resolveServiceIcon(service.id, service.iconUrl);
  if (iconUrl) {
    iconImg.src = iconUrl;
  } else {
    iconImg.src = PLACEHOLDER_ICON_URL;
  }

  iconImg.alt = service.name;
  iconImg.onerror = function () {
    this.src = PLACEHOLDER_ICON_URL;
    this.onerror = null;
  };

  const nameSpan = document.createElement('span');
  nameSpan.className = 'service-name';
  nameSpan.textContent = service.name;

  const idBadge = document.createElement('span');
  idBadge.className = 'service-id-badge';
  idBadge.textContent = service.id;

  item.appendChild(checkbox);
  item.appendChild(iconImg);
  item.appendChild(nameSpan);
  item.appendChild(idBadge);

  if (isDraggable) {
    const dragGrip = document.createElement('span');
    dragGrip.className = 'drag-grip';
    dragGrip.title = 'Drag to reorder';
    dragGrip.setAttribute('aria-label', 'Drag to reorder');
    dragGrip.textContent = '⋮⋮';
    item.appendChild(dragGrip);
  }

  item.addEventListener('click', (e) => handlers.onClick(e, service.id));
  checkbox.addEventListener('click', (e) => {
    e.stopPropagation();
    handlers.onClick(e, service.id);
  });

  return item;
}
