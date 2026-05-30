import { COMPETITION_SCENARIOS } from './scenarios'

export type CompetitionScenarioId = 'family' | 'friends'

const normalizedPrompts = new Map<string, CompetitionScenarioId>(
  COMPETITION_SCENARIOS.filter((s) => s.enabled).map((s) => [
    s.prompt.trim(),
    s.id as CompetitionScenarioId,
  ]),
)

/** 是否为官网 / 比赛预设的标准话术（评委展示用） */
export function matchCompetitionScenario(input: string): CompetitionScenarioId | null {
  const key = input.trim()
  return normalizedPrompts.get(key) ?? null
}

export function isCompetitionDemoInput(input: string): boolean {
  return matchCompetitionScenario(input) != null
}

/** 评委展示：固定 POI，保证库存与路线稳定 */
export const COMPETITION_POI_IDS: Record<
  CompetitionScenarioId,
  Partial<Record<string, string>>
> = {
  family: {
    park: 'p1',
    light_meal: 'l1',
    garden: 'g2',
  },
  friends: {
    walk_street: 'w2',
    bbq: 'b1',
    arcade: 'a1',
  },
}

export function getCompetitionPoiId(
  scenarioId: CompetitionScenarioId,
  poiType: string,
): string | undefined {
  return COMPETITION_POI_IDS[scenarioId][poiType]
}

/** 评委展示链路使用的 POI —— 库存/门票始终可用 */
export const COMPETITION_GUARANTEED_POI_IDS = new Set(
  Object.values(COMPETITION_POI_IDS).flatMap((m) => Object.values(m)),
)
