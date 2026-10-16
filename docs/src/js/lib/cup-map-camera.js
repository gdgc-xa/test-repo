// Camera math adapted from the TXC schematic camera. Drawing units, not GPS.
export const MAP_SIZE = { width: 560, height: 310 };
export const MAX_SCALE = 7;
export const minScale = size => Math.min(MAX_SCALE, Math.min(size.width / MAP_SIZE.width, size.height / MAP_SIZE.height) * 0.9);
export function constrainCamera(camera, size) {
  const scale = Math.max(minScale(size), Math.min(MAX_SCALE, camera.scale));
  const overview = MAP_SIZE.width * scale <= size.width && MAP_SIZE.height * scale <= size.height;
  return { scale,
    x: overview ? MAP_SIZE.width / 2 : Math.max(0, Math.min(MAP_SIZE.width, camera.x)),
    y: overview ? MAP_SIZE.height / 2 : Math.max(0, Math.min(MAP_SIZE.height, camera.y)) };
}
export function initialCamera(size) {
  return constrainCamera({ x: size.width < 768 ? 260 : 280, y: 155,
    scale: Math.max(2.4, size.width / MAP_SIZE.width * 1.25) }, size);
}
export function worldAt(camera, size, point) {
  return { x: camera.x + (point.x - size.width / 2) / camera.scale,
    y: camera.y + (point.y - size.height / 2) / camera.scale };
}
export function zoomAt(camera, size, nextScale, anchor) {
  const scale = Math.max(minScale(size), Math.min(MAX_SCALE, nextScale));
  const world = worldAt(camera, size, anchor);
  return constrainCamera({ scale, x: world.x - (anchor.x - size.width / 2) / scale,
    y: world.y - (anchor.y - size.height / 2) / scale }, size);
}
export function panBy(camera, size, dx, dy) {
  return constrainCamera({ ...camera, x: camera.x - dx / camera.scale, y: camera.y - dy / camera.scale }, size);
}
export function pinchCamera(camera, size, startMidpoint, nextMidpoint, ratio) {
  const scale = Math.max(minScale(size), Math.min(MAX_SCALE, camera.scale * ratio));
  const world = worldAt(camera, size, startMidpoint);
  return constrainCamera({ scale, x: world.x - (nextMidpoint.x - size.width / 2) / scale,
    y: world.y - (nextMidpoint.y - size.height / 2) / scale }, size);
}
