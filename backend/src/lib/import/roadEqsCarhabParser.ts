import fs from 'node:fs/promises';
import { parse } from 'csv-parse/sync';

export type TrafficCsvRow = {
  structureName: string;
  unit: string;
  geoCode: string;
  geoName: string;
  timePeriod: number;
  observationValue: number;
  observationFlag: string | null;
  confidentialityStatus: string | null;
};

function normalizeString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function parseRoadEqsCarhab(csvPath: string): Promise<TrafficCsvRow[]> {
  const contents = await fs.readFile(csvPath, 'utf8');
  const records = parse(contents, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];

  return records
    .filter((record) => normalizeString(record.OBS_VALUE) !== null)
    .map((record) => ({
      structureName: record.STRUCTURE_NAME.trim(),
      unit: record.unit.trim(),
      geoCode: record.geo.trim(),
      geoName: record['Geopolitical entity (reporting)'].trim(),
      timePeriod: Number(record.TIME_PERIOD),
      observationValue: Number(record.OBS_VALUE),
      observationFlag: normalizeString(record.OBS_FLAG),
      confidentialityStatus: normalizeString(record.CONF_STATUS),
    }));
}
