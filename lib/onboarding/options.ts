// The answer options both the wizards and the server-side check use — ONE list, so what
// the screen offers and what the server accepts can never drift apart.

export const CLEANER_SERVICES: { value: string; key: string }[] = [
  { value: 'General home cleaning', key: 'svcGeneral' },
  { value: 'Deep cleaning', key: 'svcDeep' },
  { value: 'Closets', key: 'svcClosets' },
  { value: 'Windows', key: 'svcWindows' },
  { value: 'Laundry', key: 'svcLaundry' },
  { value: 'Pesach', key: 'svcPesach' },
  { value: 'Move-in', key: 'svcMoveIn' },
  { value: 'Move-out', key: 'svcMoveOut' },
  { value: 'Airbnb', key: 'svcAirbnb' },
  { value: 'Organization', key: 'svcOrganization' },
  { value: 'Newly renovated', key: 'svcRenovated' },
  { value: 'Pet friendly', key: 'svcPetFriendly' },
  { value: 'Residential cleaning', key: 'svcResidential' },
  { value: 'Commercial cleaning', key: 'svcCommercial' },
  { value: 'Offices', key: 'svcOffices' },
  { value: 'Other', key: 'svcOther' },
]
export const MATCH_TYPES = ['recurring', 'occasional', 'other'] as const

export const HOME_TYPES = ['apartment', 'house', 'guesthouse', 'other'] as const
export const FREQUENCIES = ['weekly', 'twice_monthly', 'occasional', 'one_time'] as const
export const CLEANING_TYPES = ['regular', 'deep'] as const
export const PRIORITIES = ['kitchen', 'bathrooms', 'floors', 'dusting', 'windows', 'linens', 'laundry', 'outdoor', 'other'] as const
export const PET_TYPES = ['dog', 'cat', 'other'] as const
