// ── Schema de validação do formulário de Logística Reversa ───────────────────
// Usa Zod com .superRefine() para validação condicional:
// `justificativa_outros` é obrigatória APENAS quando motivo === 'Outros'.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { MOTIVOS, SETORES, AUTORIZACOES } from '../types';

// Lista plana de todas as autorizações possíveis (para validação genérica)
const todasAutorizacoes = [
  ...AUTORIZACOES.Alinare,
  ...AUTORIZACOES.Novitah,
] as const;

export const formSchema = z
  .object({
    /** Data da solicitação no formato YYYY-MM-DD */
    data_solicitacao: z
      .string({ required_error: 'Selecione a data da solicitação.' })
      .min(1, 'Selecione a data da solicitação.'),

    /** Nome do responsável interno */
    solicitante: z
      .string({ required_error: 'Informe o nome do solicitante.' })
      .transform(val => val.replace(/<[^>]*>?/gm, '').trim())
      .pipe(z.string().min(2, 'Nome deve ter ao menos 2 caracteres.').max(100, 'Nome muito longo.')),

    /** Setor interno */
    setor: z.enum(SETORES, {
      errorMap: () => ({ message: 'Selecione um setor válido.' }),
    }),

    /** Código numérico da cliente */
    codigo_cliente: z
      .number({
        required_error: 'Informe o código da cliente.',
        invalid_type_error: 'O código deve ser um número inteiro.',
      })
      .int('O código deve ser um número inteiro.')
      .positive('O código deve ser maior que zero.'),

    /** Nome completo da cliente */
    nome_cliente: z
      .string({ required_error: 'Informe o nome da cliente.' })
      .transform(val => val.replace(/<[^>]*>?/gm, '').trim())
      .pipe(z.string().min(2, 'Nome deve ter ao menos 2 caracteres.').max(150, 'Nome muito longo.')),

    /** Endereço de postagem */
    endereco_postagem: z
      .string({ required_error: 'Informe o endereço de postagem.' })
      .transform(val => val.replace(/<[^>]*>?/gm, '').trim())
      .pipe(z.string().min(5, 'Endereço deve ter ao menos 5 caracteres.').max(300, 'Endereço muito longo.')),

    /** Motivo principal do reverso */
    motivo: z.enum(MOTIVOS, {
      errorMap: () => ({ message: 'Selecione um motivo válido.' }),
    }),

    /**
     * Obrigatório quando motivo === 'Outros'.
     * A validação condicional está no .superRefine() abaixo.
     */
    justificativa_outros: z
      .string()
      .transform(val => val.replace(/<[^>]*>?/gm, '').trim())
      .pipe(z.string().max(500, 'Justificativa muito longa (máximo 500 caracteres).'))
      .optional()
      .or(z.literal('')),

    /** Autorização do reverso */
    autorizacao: z.string({
      required_error: 'Selecione o responsável pela autorização.',
    }).refine(
      (val) => todasAutorizacoes.includes(val as typeof todasAutorizacoes[number]),
      { message: 'Selecione um autorizador válido.' }
    ),
  })
  .superRefine((data, ctx) => {
    // Justificativa obrigatória quando motivo for 'Outros'
    if (
      data.motivo === 'Outros' &&
      (!data.justificativa_outros || data.justificativa_outros.trim() === '')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['justificativa_outros'],
        message: 'Justifique o motivo "Outros" para prosseguir.',
      });
    }
  });

/** Tipo inferido do schema — usado nos componentes */
export type FormData = z.infer<typeof formSchema>;
