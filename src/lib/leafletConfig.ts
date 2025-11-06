import * as L from 'leaflet';

// Fix for default marker icons not loading correctly in Webpack/Vite environments
// This must run synchronously when the module is loaded.
if (typeof (L.Icon.Default.prototype as any)._getIconUrl !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
}

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Export L for use in components if needed, but primarily used for side effects here.
export { L };