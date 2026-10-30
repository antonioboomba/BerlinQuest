import { AMT_DIALOGS } from './amt';
import { DIALOGS as BAR_DIALOGS, type Dialog } from './bar';
import { WG_DIALOGS } from './wg';

// Índice único de diálogos. Cada misión aporta los suyos en su propio archivo de datos.
export const DIALOGS: Record<string, Dialog> = { ...BAR_DIALOGS, ...AMT_DIALOGS, ...WG_DIALOGS };
