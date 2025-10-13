// src/types/google-maps.d.ts

// This declaration file informs TypeScript about the global 'google' object
// and its 'maps' property, which are exposed by the Google Maps JavaScript API.
// This resolves 'Cannot find namespace 'google'' and 'Property 'google' does not exist on type 'Window & typeof globalThis'' errors.

declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: HTMLElement, opts?: MapOptions);
      setCenter(latLng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      addListener(eventName: string, handler: Function): MapsEventListener;
      getCenter(): LatLng;
      getZoom(): number;
      setMapTypeId(mapTypeId: MapTypeId | string): void;
      getMapTypeId(): MapTypeId | string;
      setOptions(options: MapOptions): void;
      getDiv(): HTMLElement;
    }

    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      mapId?: string;
      disableDefaultUI?: boolean;
      zoomControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      // Add other common map options as needed
    }

    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      addListener(eventName: string, handler: Function): MapsEventListener;
    }

    interface MarkerOptions {
      position?: LatLng | LatLngLiteral;
      map?: Map;
      title?: string;
      icon?: string | Icon | Symbol;
      // Add other common marker options as needed
    }

    interface Icon {
      url: string;
      size?: Size;
      origin?: Point;
      anchor?: Point;
      scaledSize?: Size;
    }

    interface Symbol {
      path: SymbolPath | string;
      anchor?: Point;
      fillColor?: string;
      fillOpacity?: number;
      rotation?: number;
      scale?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
    }

    enum SymbolPath {
      CIRCLE,
      BACKWARD_CLOSED_ARROW,
      FORWARD_CLOSED_ARROW,
      BACKWARD_OPEN_ARROW,
      FORWARD_OPEN_ARROW,
    }

    class InfoWindow {
      constructor(opts?: InfoWindowOptions);
      open(map?: Map | StreetViewPanorama, anchor?: Marker | MVCObject): void;
      close(): void;
      setContent(content: string | Node): void;
    }

    interface InfoWindowOptions {
      content?: string | Node;
      position?: LatLng | LatLngLiteral;
      pixelOffset?: Size;
      maxWidth?: number;
      zIndex?: number;
      disableAutoPan?: boolean;
    }

    class LatLng {
      constructor(lat: number, lng: number, noWrap?: boolean);
      lat(): number;
      lng(): number;
      equals(other: LatLng): boolean;
      toString(): string;
      toUrlValue(precision?: number): string;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    class Point {
      constructor(x: number, y: number);
      x: number;
      y: number;
      equals(other: Point): boolean;
      toString(): string;
    }

    class Size {
      constructor(width: number, height: number, widthUnit?: string, heightUnit?: string);
      width: number;
      height: number;
      equals(other: Size): boolean;
      toString(): string;
    }

    interface MapsEventListener {
      remove(): void;
    }

    // Add other types like StreetViewPanorama, MVCObject, MapTypeId, etc., if needed
  }
}