// src/types/global.d.ts

// Explicitly declare react-color to resolve TS7016
declare module 'react-color';

// Explicitly declare types for react-beautiful-dnd to resolve TS2694 errors
declare module 'react-beautiful-dnd' {
  export interface DropResult {
    draggableId: string;
    type: string;
    source: DraggableLocation;
    destination?: DraggableLocation | null;
    reason: 'DROP';
    mode: 'FLUID' | 'SNAP';
    combine?: Combine | null;
  }

  export interface DraggableLocation {
    droppableId: string;
    index: number;
  }

  export interface DroppableProvided {
    innerRef: (element: HTMLElement | null) => any;
    placeholder?: React.ReactElement | null;
    droppableProps: {
      'data-rbd-droppable-id': string;
      'data-rbd-droppable-context-id': string;
      'aria-describedby': string;
    };
  }

  export interface DraggableProvided {
    innerRef: (element: HTMLElement | null) => any;
    draggableProps: {
      'data-rbd-draggable-context-id': string;
      'data-rbd-draggable-id': string;
      style?: React.CSSProperties;
      tabIndex?: number;
      'aria-grabbed': boolean;
      onTransitionEnd?: (event: TransitionEvent) => void;
    };
    dragHandleProps?: {
      'data-rbd-drag-handle-draggable-id': string;
      'data-rbd-drag-handle-context-id': string;
      tabIndex?: number;
      role?: string;
      onMouseDown?: (event: React.MouseEvent<HTMLElement>) => void;
      onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
      onTouchStart?: (event: React.TouchEvent<HTMLElement>) => void;
      'aria-labelledby'?: string;
      'aria-describedby'?: string;
    } | null;
  }

  export interface DraggableStateSnapshot {
    isDragging: boolean;
    isDropAnimating: boolean;
    dropAnimation: {
      duration: number;
      curve: string;
      moveTo: { x: number; y: number };
      opacity: number;
      scale: number;
    } | null;
    draggingOver: string | null;
    combineWith: string | null;
    combineTargetFor: string | null;
    mode: 'FLUID' | 'SNAP';
  }

  export const DragDropContext: React.ComponentType<any>;
  export const Droppable: React.ComponentType<any>;
  export const Draggable: React.ComponentType<any>;
}

// The global OneSignal declaration is now in src/types/onesignal.d.ts
// No need to declare it here.