import { resolveDyn } from '../dialogue';
import { evaluateFree, type FreeEvaluation } from '../evaluate';
import type { DialogueContext, FreeNode } from '../types';

/**
 * Capa de conversación con NPCs.
 *
 * El juego habla con un `NpcConversationProvider`, no directamente con los datos.
 * Hoy existe un proveedor guionizado (offline, determinista). Un proveedor con IA
 * puede implementar la misma interfaz: recibe el nodo (objetivo comunicativo, reglas,
 * respuestas modelo) y el texto del jugador, y devuelve la réplica del NPC más la
 * corrección. Si falla o no está configurado, el juego vuelve al guionizado.
 *
 * Principio pedagógico: el NPC responde con una «reformulación» (recast) natural y
 * la corrección explícita aparece aparte, plegada, sin cortar la conversación.
 */

export interface NpcTurn {
  speaker: string;
  de: string;
  es: string;
}

export interface NpcResponse {
  evaluation: FreeEvaluation;
  /** réplica del NPC dentro de la ficción */
  reply: NpcTurn;
  /** si el NPC no entendió, pide repetir (reintento dentro de la ficción) */
  askAgain: boolean;
}

export interface NpcConversationProvider {
  id: string;
  label: string;
  respond(node: FreeNode, playerText: string, ctx: DialogueContext, attempt: number): Promise<NpcResponse>;
}

const CLARIFY: NpcTurn[] = [
  { speaker: '', de: 'Entschuldigung, wie bitte?', es: 'Perdone, ¿cómo dice?' },
  { speaker: '', de: 'Hm, das habe ich nicht ganz verstanden. Noch einmal, bitte?', es: 'Mmm, no lo he entendido del todo. ¿Otra vez, por favor?' },
];

export const scriptedProvider: NpcConversationProvider = {
  id: 'scripted',
  label: 'Diálogos guionizados (offline)',
  async respond(node, playerText, ctx, attempt) {
    const models = resolveDyn(node.modelAnswers, ctx);
    const evaluation = evaluateFree(playerText, node.rules, models, ctx);

    // Primer intento sin el mensaje completo → el NPC pide repetir, como en la vida real.
    if (!evaluation.understood && attempt === 0) {
      const c = CLARIFY[Math.floor(Math.random() * CLARIFY.length)];
      return { evaluation, askAgain: true, reply: { ...c, speaker: node.npcReply.speaker } };
    }

    return {
      evaluation,
      askAgain: false,
      reply: {
        speaker: node.npcReply.speaker,
        de: resolveDyn(node.npcReply.de, ctx),
        es: resolveDyn(node.npcReply.es, ctx),
      },
    };
  },
};

export function getNpcProvider(): NpcConversationProvider {
  return scriptedProvider;
}
