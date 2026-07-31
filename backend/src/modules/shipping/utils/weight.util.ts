export function volumetricWeightKg(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  divisor = 5000,
): number {
  return Number(((lengthCm * widthCm * heightCm) / divisor).toFixed(3));
}
