export function getZoomExtent(
  value: number,
  min: number,
  max: number,
  scaleFactor: number,
  isLogarithmic: boolean = false
): [number, number] {
  const range = max - min;
  const ratioLeft = (value - min) / range;
  const ratioRight = 1 - ratioLeft;
  const newRange = range * scaleFactor;
  let newMin = value - newRange * ratioLeft;
  let newMax = value + newRange * ratioRight;
  if (isLogarithmic) {
    if (newMin <= 0) {
      newMin = 0.1;
    }

    if (newMax <= 0) {
      newMax = 0.1;
    }
  }
  return [newMin, newMax];
}
