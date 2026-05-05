import { optionalEnv } from "@/lib/env";

type CityMap = Record<string, string | number>;

function normalizeCityName(value: string) {
  return value
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function loadCityMap(): CityMap {
  const raw = optionalEnv("QP_CITY_MAP");
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as CityMap;

    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [normalizeCityName(key), value]),
    );
  } catch {
    return {};
  }
}

export function resolveQpCityValue(cityName: string, explicitCityId?: string | number) {
  if (explicitCityId !== undefined && String(explicitCityId).trim() !== "") {
    const numeric = Number(explicitCityId);
    return Number.isNaN(numeric) ? undefined : numeric;
  }

  const numericCity = Number(cityName);
  if (cityName.trim() !== "" && !Number.isNaN(numericCity)) {
    return numericCity;
  }

  const mapped = loadCityMap()[normalizeCityName(cityName)];
  if (mapped !== undefined) {
    const numeric = Number(mapped);
    return Number.isNaN(numeric) ? undefined : numeric;
  }

  return undefined;
}
