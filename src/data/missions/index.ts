import type { Mission } from '../../engine/types';
import { buergeramt } from './buergeramt';
import { bar, club, wg } from './upcoming';

export const MISSIONS: Record<string, Mission> = { buergeramt, bar, wg, club };
