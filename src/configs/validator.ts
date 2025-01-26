import { ManagerConfigValidationException } from 'src/error';

export function ValidateInteager(
  value: number,
  least: number,
  section: string,
  valueName = 'Value',
): void {
  if (typeof value !== 'number') {
    throw new ManagerConfigValidationException(
      `[${section}] Value should be number - ${valueName}: ${value}`,
    );
  }
  if (value < 0) {
    throw new ManagerConfigValidationException(
      `[${section}] Negative number not allowed - ${valueName}: ${value}`,
    );
  }
  if (value < least) {
    throw new ManagerConfigValidationException(
      `[${section}] ${valueName} should be larger or equal than ${least} - ${valueName}: ${value}`,
    );
  }
}

export function ValidateRange(
  minRange: number,
  maxRange: number,
  leastRange: number,
  section: string,
  minRangeName: string = 'Min',
  maxRangeName: string = 'Max',
): void {
  if (typeof minRange !== 'number' || typeof maxRange !== 'number') {
    throw new ManagerConfigValidationException(
      `[${section}] Value should be number - ${minRangeName}: ${minRange}, ${maxRangeName}: ${maxRange}`,
    );
  }
  if (minRange < 0 || maxRange < 0) {
    throw new ManagerConfigValidationException(
      `[${section}] Negative number not allowed - ${minRangeName}: ${minRange}, ${maxRangeName}: ${maxRange}`,
    );
  }
  if (minRange < leastRange) {
    throw new ManagerConfigValidationException(
      `[${section}] ${minRangeName} value should be larger or equal than ${leastRange} - ${minRangeName}: ${minRange}`,
    );
  }
  if (minRange > maxRange) {
    throw new ManagerConfigValidationException(
      `[${section}] ${minRangeName} should be less than ${maxRangeName} value - ${minRangeName}: ${minRange}, ${maxRangeName}: ${maxRange}`,
    );
  }
}

export function ValidateBoolean(value: boolean, section: string): void {
  if (typeof value !== 'boolean') {
    throw new ManagerConfigValidationException(
      `[${section}] Value should be boolean`,
    );
  }
}
