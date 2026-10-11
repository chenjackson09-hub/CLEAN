import proj4 from 'proj4'

// Israeli Transverse Mercator (EPSG:2039, "ITM") → WGS84 latitude/longitude.
// Used only by the locality import, to convert the official file's coordinates.
proj4.defs(
  'EPSG:2039',
  '+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +towgs84=-48,55,52,0,0,0,0 +units=m +no_defs',
)

export function itmToWgs84(x: number, y: number): { lat: number; lng: number } {
  const [lng, lat] = proj4('EPSG:2039', 'WGS84', [x, y])
  return { lat, lng }
}
