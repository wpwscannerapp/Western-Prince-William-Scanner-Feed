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

// OneSignal SDK Global Declaration
// This declares the actual OneSignal SDK object's methods
interface OneSignalSDK {
  init(options: { appId: string; safari_web_id?: string; allowLocalhostAsSecureOrigin?: boolean; notifyButton?: { enable: boolean } }): Promise<void>;
  Notifications: {
    isPushNotificationsSupported(): boolean;
    addEventListener(event: 'subscriptionchange', callback: (isSubscribed: boolean) => void): void;
    permission: NotificationPermission;
    requestPermission(): Promise<void>;
    isPushEnabled(): Promise<boolean>;
    setSubscription(enabled: boolean): Promise<void>;
  };
  User: {
    addTag(key: string, value: string): Promise<void>;
    PushSubscription: {
      getFCMToken(): Promise<string | null>;
      getId(): Promise<string | null>;
    };
  };
  // Add other OneSignal methods/properties as needed
}

// This is the array-like object that queues commands before the SDK is fully loaded
interface OneSignalDeferredArray extends Array<(...args: any[]) => void> {
  push(callback: () => void): void;
}

declare var OneSignalDeferred: OneSignalDeferredArray;
declare var OneSignal: OneSignalSDK | undefined;

declare global {
  interface Window {
    OneSignalDeferred: OneSignalDeferredArray;
    OneSignal: OneSignalSDK | undefined; // Add to window interface
  }
}