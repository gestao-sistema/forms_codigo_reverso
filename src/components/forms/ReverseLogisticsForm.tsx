// ── Formulário Base de Logística Reversa ─────────────────────────────────────
//
// Componente reutilizável que adapta identidade visual e listas de opções
// conforme a prop `empresa`. Alinare → navy; Novitah → rosé.
//
// Cronômetro silencioso: captura o timestamp de montagem e calcula
// `tempo_preenchimento_segundos` no momento do submit — sem exibir ao usuário.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale/pt-BR';
import toast from 'react-hot-toast';
import { Loader2, CalendarDays, Send } from 'lucide-react';

import 'react-datepicker/dist/react-datepicker.css';

import { formSchema, type FormData } from '../../schemas/formSchema';
import { MOTIVOS, SETORES, AUTORIZACOES, type Empresa } from '../../types';
import apiService from '../../services/apiService';

import alinareLogoSrc from '../../assets/alinare_logo.jpg';
import novitahLogoSrc from '../../assets/novitah_logo.jpg';

// Registra localização pt-BR para o DatePicker
registerLocale('pt-BR', ptBR);

// ── Tokens visuais por empresa ────────────────────────────────────────────────
const TEMA = {
  Alinare: {
    pageBg: 'bg-[#F8F9FA]',
    headerBg: 'bg-[#2B2D42]',
    headerText: 'text-[#F0EDEE]',
    btnBg: 'bg-[#2B2D42] hover:bg-[#1E202F] active:scale-[0.98] shadow-sm hover:shadow-md',
    btnText: 'text-[#F0EDEE]',
    focusRing: 'focus:ring-[#2B2D42]/30',
    logo: alinareLogoSrc,
    logoAlt: 'Logotipo Alinare',
    borderColor: 'border-slate-200',
  },
  Novitah: {
    pageBg: 'bg-[#FDF8F7]',
    headerBg: 'bg-[#A67B7B]',
    headerText: 'text-white',
    btnBg: 'bg-[#A67B7B] hover:bg-[#8C6363] active:scale-[0.98] shadow-sm hover:shadow-md',
    btnText: 'text-white',
    focusRing: 'focus:ring-[#A67B7B]/30',
    logo: novitahLogoSrc,
    logoAlt: 'Logotipo Novitah',
    borderColor: 'border-[#E8D5D5]',
  },
} as const;

// ── Setores filtrados por empresa ─────────────────────────────────────────────
const SETORES_POR_EMPRESA: Record<Empresa, typeof SETORES[number][]> = {
  Alinare: ['Comercial Alinare', 'Financeiro', 'Assistência Técnica'],
  Novitah: ['Comercial Novitah', 'Financeiro', 'Assistência Técnica'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Formata Date para YYYY-MM-DD sem conversão de fuso */
const dateToString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Converte YYYY-MM-DD para objeto Date no fuso local */
const stringToDate = (str: string): Date | null => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// ── Classes reutilizáveis ─────────────────────────────────────────────────────
const inputBase =
  'w-full h-11 px-4 rounded-lg border bg-white text-sm text-slate-900 ' +
  'placeholder:text-slate-400 transition-colors duration-150 ' +
  'focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const labelBase = 'block text-sm font-medium text-slate-700 mb-1.5';
const errorBase = 'mt-1.5 text-xs text-red-600';

// ── Props do componente ───────────────────────────────────────────────────────
interface ReverseLogisticsFormProps {
  empresa: Empresa;
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function ReverseLogisticsForm({ empresa }: ReverseLogisticsFormProps) {
  const tema = TEMA[empresa];
  const autorizacoes = AUTORIZACOES[empresa];
  const setores = SETORES_POR_EMPRESA[empresa];

  // Cronômetro: registra o instante de montagem do formulário
  const startTimeRef = useRef<number>(Date.now());

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_solicitacao: '',
      solicitante: '',
      setor: undefined,
      codigo_cliente: undefined,
      nome_cliente: '',
      endereco_postagem: '',
      motivo: undefined,
      justificativa_outros: '',
      autorizacao: '',
    },
  });

  // Observa o campo motivo para exibição condicional da justificativa
  const motivoAtual = watch('motivo');
  const exibirJustificativa = motivoAtual === 'Outros';

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    // Calcula segundos desde a abertura do formulário
    const tempoSegundos = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      await apiService.createSolicitacao({
        empresa,
        data_solicitacao: data.data_solicitacao,
        solicitante: data.solicitante,
        setor: data.setor,
        codigo_cliente: data.codigo_cliente,
        nome_cliente: data.nome_cliente,
        endereco_postagem: data.endereco_postagem,
        motivo: data.motivo,
        justificativa_outros: exibirJustificativa
          ? (data.justificativa_outros ?? null)
          : null,
        autorizacao: data.autorizacao,
        resolvido: false,
        tempo_preenchimento_segundos: tempoSegundos,
      });

      toast.success('Solicitação enviada com sucesso!');
      reset();
      // Reinicia o cronômetro após submit bem-sucedido
      startTimeRef.current = Date.now();
    } catch {
      toast.error('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`w-full h-full`}>
      <div className="max-w-2xl mx-auto">

        {/* Card do formulário */}
        <div className={`bg-white rounded-2xl shadow-sm border ${tema.borderColor} overflow-hidden`}>

          {/* ── Header com identidade visual da empresa ── */}
          <div className={`${tema.headerBg} px-8 py-6 flex items-center gap-5`}>
            <img
              src={tema.logo}
              alt={tema.logoAlt}
              className="h-14 w-auto rounded-lg object-contain"
            />
            <div>
              <h1 className={`text-xl font-semibold ${tema.headerText} leading-tight`}>
                Solicitação de Logística Reversa
              </h1>
              <p className={`text-sm mt-0.5 ${tema.headerText} opacity-75`}>
                Preencha todos os campos obrigatórios
              </p>
            </div>
          </div>

          {/* ── Corpo do formulário ── */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            aria-label={`Formulário de logística reversa ${empresa}`}
            className="px-8 py-8 space-y-6"
          >

            {/* Data da solicitação */}
            <div>
              <label htmlFor="data_solicitacao" className={labelBase}>
                <CalendarDays className="inline w-4 h-4 mr-1.5 -mt-0.5 opacity-60" />
                Data da Solicitação <span className="text-red-500">*</span>
              </label>

              <Controller
                name="data_solicitacao"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    id="data_solicitacao"
                    locale="pt-BR"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="dd/mm/aaaa"
                    selected={stringToDate(field.value)}
                    onChange={(date: Date | null) =>
                      field.onChange(date ? dateToString(date) : '')
                    }
                    maxDate={new Date()}
                    className={`
                      ${inputBase}
                      ${tema.focusRing}
                      ${errors.data_solicitacao ? 'border-red-400' : 'border-slate-300'}
                    `}
                    wrapperClassName="w-full"
                    aria-invalid={errors.data_solicitacao ? 'true' : 'false'}
                    aria-describedby={
                      errors.data_solicitacao ? 'err-data' : undefined
                    }
                    disabled={isSubmitting}
                  />
                )}
              />

              {errors.data_solicitacao && (
                <p id="err-data" className={errorBase} role="alert">
                  {errors.data_solicitacao.message}
                </p>
              )}
            </div>

            {/* Solicitante + Setor — 2 colunas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* Solicitante */}
              <div>
                <label htmlFor="solicitante" className={labelBase}>
                  Solicitante <span className="text-red-500">*</span>
                </label>
                <input
                  id="solicitante"
                  type="text"
                  autoComplete="name"
                  placeholder="Nome do responsável"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.solicitante}
                  aria-describedby={errors.solicitante ? 'err-solicitante' : undefined}
                  className={`
                    ${inputBase} ${tema.focusRing}
                    ${errors.solicitante ? 'border-red-400' : 'border-slate-300'}
                  `}
                  {...register('solicitante')}
                />
                {errors.solicitante && (
                  <p id="err-solicitante" className={errorBase} role="alert">
                    {errors.solicitante.message}
                  </p>
                )}
              </div>

              {/* Setor */}
              <div>
                <label htmlFor="setor" className={labelBase}>
                  Setor <span className="text-red-500">*</span>
                </label>
                <select
                  id="setor"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.setor}
                  aria-describedby={errors.setor ? 'err-setor' : undefined}
                  className={`
                    ${inputBase} ${tema.focusRing} cursor-pointer
                    ${errors.setor ? 'border-red-400' : 'border-slate-300'}
                  `}
                  {...register('setor')}
                >
                  <option value="">Selecione o setor</option>
                  {setores.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {errors.setor && (
                  <p id="err-setor" className={errorBase} role="alert">
                    {errors.setor.message}
                  </p>
                )}
              </div>
            </div>

            {/* Código + Nome da cliente — 2 colunas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* Código da cliente */}
              <div>
                <label htmlFor="codigo_cliente" className={labelBase}>
                  Código da Cliente <span className="text-red-500">*</span>
                </label>
                <input
                  id="codigo_cliente"
                  type="number"
                  inputMode="numeric"
                  placeholder="Ex: 10234"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.codigo_cliente}
                  aria-describedby={errors.codigo_cliente ? 'err-codigo' : undefined}
                  className={`
                    ${inputBase} ${tema.focusRing}
                    ${errors.codigo_cliente ? 'border-red-400' : 'border-slate-300'}
                  `}
                  {...register('codigo_cliente', { valueAsNumber: true })}
                />
                {errors.codigo_cliente && (
                  <p id="err-codigo" className={errorBase} role="alert">
                    {errors.codigo_cliente.message}
                  </p>
                )}
              </div>

              {/* Nome da cliente */}
              <div>
                <label htmlFor="nome_cliente" className={labelBase}>
                  Nome da Cliente <span className="text-red-500">*</span>
                </label>
                <input
                  id="nome_cliente"
                  type="text"
                  autoComplete="off"
                  placeholder="Nome completo"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.nome_cliente}
                  aria-describedby={errors.nome_cliente ? 'err-nome' : undefined}
                  className={`
                    ${inputBase} ${tema.focusRing}
                    ${errors.nome_cliente ? 'border-red-400' : 'border-slate-300'}
                  `}
                  {...register('nome_cliente')}
                />
                {errors.nome_cliente && (
                  <p id="err-nome" className={errorBase} role="alert">
                    {errors.nome_cliente.message}
                  </p>
                )}
              </div>
            </div>

            {/* Endereço de postagem — full width */}
            <div>
              <label htmlFor="endereco_postagem" className={labelBase}>
                Endereço de Postagem <span className="text-red-500">*</span>
              </label>
              <input
                id="endereco_postagem"
                type="text"
                autoComplete="street-address"
                placeholder="Rua, número, bairro, cidade/UF"
                disabled={isSubmitting}
                aria-invalid={!!errors.endereco_postagem}
                aria-describedby={errors.endereco_postagem ? 'err-endereco' : undefined}
                className={`
                  ${inputBase} ${tema.focusRing}
                  ${errors.endereco_postagem ? 'border-red-400' : 'border-slate-300'}
                `}
                {...register('endereco_postagem')}
              />
              {errors.endereco_postagem && (
                <p id="err-endereco" className={errorBase} role="alert">
                  {errors.endereco_postagem.message}
                </p>
              )}
            </div>

            {/* Motivo */}
            <div>
              <label htmlFor="motivo" className={labelBase}>
                Motivo <span className="text-red-500">*</span>
              </label>
              <select
                id="motivo"
                disabled={isSubmitting}
                aria-invalid={!!errors.motivo}
                aria-describedby={errors.motivo ? 'err-motivo' : undefined}
                className={`
                  ${inputBase} ${tema.focusRing} cursor-pointer
                  ${errors.motivo ? 'border-red-400' : 'border-slate-300'}
                `}
                {...register('motivo')}
              >
                <option value="">Selecione o motivo</option>
                {MOTIVOS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {errors.motivo && (
                <p id="err-motivo" className={errorBase} role="alert">
                  {errors.motivo.message}
                </p>
              )}
            </div>

            {/* Justificativa "Outros" — visível condicionalmente com animação */}
            <div
              className={`
                overflow-hidden transition-all duration-200 ease-out
                ${exibirJustificativa
                  ? 'max-h-40 opacity-100'
                  : 'max-h-0 opacity-0 pointer-events-none'
                }
              `}
              aria-hidden={!exibirJustificativa}
            >
              <div className="pt-1">
                <label htmlFor="justificativa_outros" className={labelBase}>
                  Justifique a opção "Outros"{' '}
                  {exibirJustificativa && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  id="justificativa_outros"
                  rows={3}
                  placeholder="Descreva o motivo detalhadamente..."
                  disabled={isSubmitting || !exibirJustificativa}
                  aria-required={exibirJustificativa}
                  aria-invalid={!!errors.justificativa_outros}
                  aria-describedby={
                    errors.justificativa_outros ? 'err-justificativa' : undefined
                  }
                  className={`
                    w-full px-4 py-3 rounded-lg border bg-white text-sm text-slate-900
                    placeholder:text-slate-400 resize-none transition-colors duration-150
                    focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${tema.focusRing}
                    ${errors.justificativa_outros ? 'border-red-400' : 'border-slate-300'}
                  `}
                  {...register('justificativa_outros')}
                />
                {errors.justificativa_outros && (
                  <p id="err-justificativa" className={errorBase} role="alert">
                    {errors.justificativa_outros.message}
                  </p>
                )}
              </div>
            </div>

            {/* Autorização do Reverso */}
            <div>
              <label htmlFor="autorizacao" className={labelBase}>
                Autorização do Reverso <span className="text-red-500">*</span>
              </label>
              <select
                id="autorizacao"
                disabled={isSubmitting}
                aria-invalid={!!errors.autorizacao}
                aria-describedby={errors.autorizacao ? 'err-autorizacao' : undefined}
                className={`
                  ${inputBase} ${tema.focusRing} cursor-pointer
                  ${errors.autorizacao ? 'border-red-400' : 'border-slate-300'}
                `}
                {...register('autorizacao')}
              >
                <option value="">Selecione o responsável</option>
                {autorizacoes.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              {errors.autorizacao && (
                <p id="err-autorizacao" className={errorBase} role="alert">
                  {errors.autorizacao.message}
                </p>
              )}
            </div>

            {/* Divider */}
            <hr className="border-slate-100" />

            {/* Botão de submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`
                w-full h-12 rounded-lg font-semibold text-sm
                flex items-center justify-center gap-2
                transition-colors duration-150 cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-offset-2
                disabled:opacity-60 disabled:cursor-not-allowed
                ${tema.btnBg} ${tema.btnText} ${tema.focusRing}
              `}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Enviando…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden="true" />
                  Enviar Solicitação
                </>
              )}
            </button>

          </form>
        </div>

        {/* Rodapé discreto */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Campos marcados com <span className="text-red-500">*</span> são obrigatórios.
        </p>
      </div>
    </div>
  );
}
