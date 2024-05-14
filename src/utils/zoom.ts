export function getZoomExtent(
  value: number,
  min: number,
  max: number,
  scaleFactor: number
): [number, number] {
  const range = max - min;
  const ratioLeft = (value - min) / range;
  const ratioRight = 1 - ratioLeft;
  const newRange = range * scaleFactor;
  const newMin = value - newRange * ratioLeft;
  const newMax = value + newRange * ratioRight;
  return [newMin, newMax];
}
