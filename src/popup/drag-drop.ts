/**
 * Drag and drop handlers
 *
 * This module provides drag and drop functionality for reordering favorite services
 * in the popup interface.
 */

import { tabs } from '../browser-api';

/** Currently dragged element */
let draggedElement: HTMLElement | null = null;

/**
 * Handles the drag start event
 * @param event - Drag event
 */
export function handleDragStart(event: DragEvent): void {
  draggedElement = event.currentTarget as HTMLElement;
  draggedElement.classList.add('dragging');

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', draggedElement.innerHTML);
  }
}

/**
 * Handles the drag end event
 * @param _event - Drag event (unused)
 */
export function handleDragEnd(_event: DragEvent): void {
  if (draggedElement) {
    draggedElement.classList.remove('dragging');
  }

  const items = document.querySelectorAll('.service-item');
  items.forEach((item) => item.classList.remove('drag-over'));

  draggedElement = null;
}

/**
 * Handles the drag over event
 * @param event - Drag event
 * @returns false to allow drop
 */
export function handleDragOver(event: DragEvent): boolean {
  if (event.preventDefault) {
    event.preventDefault();
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }

  return false;
}

/**
 * Handles the drag enter event
 * @param event - Drag event
 */
export function handleDragEnter(event: DragEvent): void {
  const target = event.currentTarget as HTMLElement;
  if (target !== draggedElement && target.classList.contains('selected')) {
    target.classList.add('drag-over');
  }
}

/**
 * Handles the drag leave event
 * @param event - Drag event
 */
export function handleDragLeave(event: DragEvent): void {
  const target = event.currentTarget as HTMLElement;
  target.classList.remove('drag-over');
}

/**
 * Callback function for saving favorites
 */
export type SaveCallback = (favorites: string[]) => Promise<void>;

/**
 * Callback function for rendering the UI
 */
export type RenderCallback = () => void;

/**
 * Callback function for displaying errors
 */
export type ErrorCallback = (message: string) => void;

/**
 * Creates a drop handler with the necessary callbacks
 * @param currentFavorites - Array of current favorite service IDs (mutable)
 * @param saveCallback - Function to save favorites to storage
 * @param renderCallback - Function to re-render the UI
 * @param errorCallback - Function to display error messages
 * @returns Drop event handler function
 */
export function createDropHandler(
  currentFavorites: string[],
  saveCallback: SaveCallback,
  renderCallback: RenderCallback,
  errorCallback: ErrorCallback
): (event: DragEvent) => Promise<boolean> {
  return async function handleDrop(event: DragEvent): Promise<boolean> {
    if (event.stopPropagation) {
      event.stopPropagation();
    }

    const target = event.currentTarget as HTMLElement;

    if (draggedElement && target !== draggedElement && target.classList.contains('selected')) {
      const draggedId = draggedElement.dataset.serviceId;
      const targetId = target.dataset.serviceId;

      if (!draggedId || !targetId) {
        return false;
      }

      const draggedIndex = currentFavorites.findIndex(
        (id) => id.toLowerCase() === draggedId.toLowerCase()
      );
      const targetIndex = currentFavorites.findIndex(
        (id) => id.toLowerCase() === targetId.toLowerCase()
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
          const awsTabs = await tabs.query({ url: 'https://*.console.aws.amazon.com/*' });
          for (const tab of awsTabs) {
            if (tab.id) {
              tabs.sendMessage(tab.id, { action: 'updateQuickbar' }).catch(() => {
                // Ignore errors from tabs that don't have content script
              });
            }
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
