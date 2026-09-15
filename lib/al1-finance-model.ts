import type { ExecutiveSnapshot, ExecutiveEntity } from './executive-model';
import { buildAl1Economics, econMonths } from './al1-economics-model';

// Reproducible synthetic cash ledger. No real bank/customer identifiers.
export const financeMethod = 'FIN-AL1-v0.20';
export const fsum = (a: number[]) => a.reduce((s, v) => s + v, 0);
const r = (x: number) => Math.round(x * 1e6) / 1e6;
export const monthEnd = (month: string) =>
  new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0))
    .toISOString()
    .slice(0, 10);
export type CashView = 'plan' | 'actual' | 'forecast';
export type CashScope = {
  start: string;
  end: string;
  view: CashView;
  account?: string;
  category?: string;
  contract?: string;
};
export const financeMetrics: Record<
  string,
  { name: string; definition: string; owner: string; unit?: string }
> = {
  cash: {
    name: 'Доступные деньги',
    definition:
      'Остатки на банковских счетах минус средства с договорными ограничениями на выбранную дату. Не включает срочные депозиты вне денежных эквивалентов и невыбранные кредитные линии.',
    owner: 'Руководитель казначейства',
  },
  balance: {
    name: 'Деньги на счетах',
    definition:
      'Начальный остаток + поступления − выплаты. На дату, не сумма остатков за период. RUB-эквивалент; в демо курс USD фиксирован 100 ₽, FX-эффект равен нулю.',
    owner: 'Казначейство / бухгалтерия',
  },
  headroom: {
    name: 'Минимальный запас ликвидности',
    definition:
      'Минимум доступных денег за 13 недель минус учебный резерв. Кредитная линия не включена. Горизонт всегда начинается после даты среза 31.08.2026 и не меняется от отбора годового P&L.',
    owner: 'Финансовый директор',
  },
  ocf: {
    name: 'Операционный денежный поток · OCF',
    definition:
      'Операционные поступления минус выплаты. В учебном профиле проценты и налог на прибыль включены в OCF. Сверяется с OP/M4 + D&A − изменение ДЗ + изменение КЗ + полученные проценты − уплаченные проценты − уплаченный налог на прибыль.',
    owner: 'Финансовый директор',
  },
  operations: {
    name: 'Операционное движение денег',
    definition:
      'Отдельно валовые поступления и выплаты основной деятельности. Внутренние переводы, тело кредитов и возврат депозитов не являются операционной выручкой.',
    owner: 'Казначейство',
  },
  banks: {
    name: 'Счета и доступность',
    definition:
      'Остатки по банкам и валютам на дату. НСО в демо — ограниченный остаток 15 млн ₽, уже включённый в деньги на счетах. Не вычитать его повторно.',
    owner: 'Руководитель казначейства',
  },
  debt: {
    name: 'Кредиты и лизинг',
    definition:
      'Тело на начало + привлечения − погашения = тело на конец. Проценты отдельно. Учебное рефинансирование сохраняет общий долг; это не подтверждённая банковская линия и не разрешение на привлечение.',
    owner: 'Финансовый директор',
  },
  deposits: {
    name: 'Размещения и НСО',
    definition:
      'Срочные депозиты 60 млн ₽ находятся вне денежных эквивалентов. Возврат тела — не процентный доход. НСО 15 млн ₽ уже находится в ограниченной части банковского остатка.',
    owner: 'Руководитель казначейства',
  },
  investments: {
    name: 'Капитальные платежи · Cash CAPEX',
    definition:
      'Оплаченная или планируемая капитальная программа; не амортизация. В демо нет продаж активов и дивидендов: соответствующие денежные поступления равны нулю в полном учебном реестре.',
    owner: 'Инвестиционный / технический директор',
  },
  settlements: {
    name: 'ДЗ и КЗ',
    definition:
      'Начальный остаток + начисления − применённые оплаты = конечный остаток. Авансы в этом учебном сценарии отсутствуют. Балансы сверяются по месяцам; точная внутримесячная дата состояния расчётов не моделируется.',
    owner: 'Бухгалтерия; сбор ДЗ — коммерческий директор',
  },
  commissions: {
    name: 'Комиссии агентам',
    definition:
      'Оплаты вознаграждения операционному и платёжному агентам. Транзитные средства третьих лиц не считаются комиссией. Это часть операционных выплат, не дополнительный расход сверх них.',
    owner: 'Казначейство / коммерческий директор',
  },
  penalties: {
    name: 'Штрафы и неустойки',
    definition:
      'Денежные выплаты по неустойкам: факт содержит оплаченные суммы, план — бюджетные, будущий прогноз — ожидаемые выплаты, ещё не оплаченные. Заявленные клиентские претензии не приравниваются автоматически к признанным обязательствам; здесь отдельный учебный кейс.',
    owner: 'Юридическая служба / владелец нарушения',
  },
  taxes: {
    name: 'Налоговые платежи',
    definition:
      'Оплаты по видам на дату платежа. Налог на прибыль связан с начислением предыдущего месяца P&L. Остальные суммы — заданный учебный календарь, не расчёт налогов по законодательству. НДС-поступление отделено от выручки.',
    owner: 'Главный бухгалтер / казначейство',
  },
  receipts: {
    name: 'Поступления',
    definition:
      'Входящие денежные события выбранного периода и категории. Не равны выручке; кредиты, возврат депозитов и НДС показаны отдельными статьями.',
    owner: 'Казначейство',
  },
  payments: {
    name: 'Выплаты',
    definition:
      'Исходящие денежные события по дате валютирования. Будущие события являются прогнозом, не исполненными платёжными поручениями.',
    owner: 'Казначейство',
  },
  reserve: {
    name: 'Минимальный резерв',
    definition:
      '100 млн ₽ — сохранённая учебная предпосылка АК1, не утверждённый норматив. Доступные деньги ниже резерва — сигнал для решения, не автоматически неплатёжеспособность.',
    owner: 'Финансовый директор',
  },
  bridge: {
    name: 'Переход от прибыли к деньгам',
    definition:
      'Сверка прямого OCF из платежей и косвенного из P&L и расчётов. Изменения ДЗ/КЗ — синтетическая калибровка прежнего cashBridge, не найденные банковские данные.',
    owner: 'Финансовый директор / бухгалтерия',
  },
  debtPrincipal: {
    name: 'Тело кредита и лизинга',
    definition:
      'Непогашенная основная сумма обязательства на выбранную дату: входящее тело + привлечения − погашения тела. Начисленные и уплаченные проценты не включаются. Остатки по месяцам не суммируются.',
    owner: 'Финансовый директор / казначейство',
  },
  debtMovement: {
    name: 'Движение тела долга за месяц',
    definition:
      'Привлечение и погашение показываются раздельно за месяц выбранной даты остатков. В демо кредит: +24 и −19 млн ₽, лизинг: −5 млн ₽. Нулевое чистое изменение общего долга не означает отсутствие платежей.',
    owner: 'Казначейство',
  },
  depositPrincipal: {
    name: 'Тело депозита на дату',
    definition:
      'Входящая основная сумма + размещения − возвраты тела. Проценты отдельно. DEP-B находится вне денежных эквивалентов; его нельзя прибавить к доступным деньгам без условий возврата. НСО уже входит в ограниченный банковский остаток.',
    owner: 'Руководитель казначейства',
  },
  reserveSurplus: {
    name: 'Запас сверх резерва на дату',
    definition:
      'Доступные деньги на указанную дату минус резерв 100 млн ₽. Отрицательное значение показывает нехватку до резерва, положительное — запас. Не равно общему остатку на счетах; кредитная линия не включена.',
    owner: 'Финансовый директор',
  },
  taxBalance: {
    name: 'Остаток налога на прибыль к уплате',
    definition:
      'Входящий остаток + начисленный налог на прибыль − выплаты налога = остаток на конец месяца. В демо входящий остаток 4 млн ₽, оплата с месячным лагом. Это учебная сверка, не подтверждённое сальдо ЕНС, не прибыль и не общая кредиторская задолженность.',
    owner: 'Главный бухгалтер',
  },
  variance: {
    name: 'Отклонение денежной суммы от плана',
    unit: 'млн ₽ и %',
    definition:
      'Δ = выбранная сумма − план того же периода и отбора. Относительное Δ = Δ / |план| × 100%; при плане 0 процент не определён. В таблице статей сравниваются факт + прогноз и полный план, в карточке OCF — выбранный сценарий и сопоставимая часть плана. Положительное отклонение выплат не означает улучшение.',
    owner: 'Финансовый директор / казначейство',
  },
  eventAmount: {
    name: 'Сумма денежного события',
    definition:
      'Сумма одного события в млн ₽: плюс — поступление, минус — выплата. Статус определяет смысл: учебный факт, бюджетный план или будущий прогноз. Эта сумма не обязательно равна выручке или расходу P&L.',
    owner: 'Казначейство',
  },
  icf: {
    name: 'Инвестиционный денежный поток · ICF',
    definition:
      'Инвестиционные поступления минус выплаты. В демо включает капитальные платежи и движение тела срочного депозита вне денежных эквивалентов; проценты по депозиту отнесены к OCF. Это учебная классификация, не утверждённая учётная политика.',
    owner: 'Финансовый директор / казначейство',
  },
  cff: {
    name: 'Финансовый денежный поток · CFF',
    definition:
      'Поступления от привлечения долга минус погашение тела кредитов и лизинга. В демо годовые +288 −228 −60 = 0 млн ₽: чистый ноль не исключает валовых движений. Проценты отнесены к OCF; дивиденды в данном сценарии отсутствуют.',
    owner: 'Финансовый директор / казначейство',
  },
};
type Category = {
  name: string;
  block: string;
  flow: 'OCF' | 'ICF' | 'CFF';
  direction: 'in' | 'out';
  owner: string;
  counterparty: string;
  contract: string;
};
export const cashCategories: Record<string, Category> = {
  customers: {
    name: 'Оплаты заказчиков без НДС',
    block: 'operations',
    flow: 'OCF',
    direction: 'in',
    owner: 'Коммерческий директор',
    counterparty: 'Заказчики A–E · демо',
    contract: 'Договоры заказчиков · демо',
  },
  vatIn: {
    name: 'НДС в поступлениях',
    block: 'taxes',
    flow: 'OCF',
    direction: 'in',
    owner: 'Главный бухгалтер',
    counterparty: 'Заказчики · демо',
    contract: 'НДС · учебный календарь',
  },
  fuel: {
    name: 'Авиационное топливо',
    block: 'operations',
    flow: 'OCF',
    direction: 'out',
    owner: 'Закупки / производство',
    counterparty: 'Поставщик топлива · демо',
    contract: 'FUEL-2026',
  },
  airport: {
    name: 'Аэропорты и наземное обслуживание',
    block: 'operations',
    flow: 'OCF',
    direction: 'out',
    owner: 'Производственный директор',
    counterparty: 'Аэропортовый агент · демо',
    contract: 'GROUND-2026',
  },
  maintenance: {
    name: 'Техническое обслуживание',
    block: 'operations',
    flow: 'OCF',
    direction: 'out',
    owner: 'Технический директор',
    counterparty: 'Подрядчик ТО · демо',
    contract: 'MRO-2026',
  },
  payroll: {
    name: 'Оплаты труда после удержаний',
    block: 'operations',
    flow: 'OCF',
    direction: 'out',
    owner: 'HR / казначейство',
    counterparty: 'Персонал · обезличено',
    contract: 'PAYROLL-2026',
  },
  suppliers: {
    name: 'Прочие операционные поставщики',
    block: 'operations',
    flow: 'OCF',
    direction: 'out',
    owner: 'Финансовый директор',
    counterparty: 'Пул поставщиков · демо',
    contract: 'OPEX-2026',
  },
  agentOp: {
    name: 'Комиссия операционному агенту',
    block: 'commissions',
    flow: 'OCF',
    direction: 'out',
    owner: 'Коммерческий директор',
    counterparty: 'Операционный агент · демо',
    contract: 'AGENT-OP-2026',
  },
  agentPay: {
    name: 'Комиссия платёжному агенту',
    block: 'commissions',
    flow: 'OCF',
    direction: 'out',
    owner: 'Казначейство',
    counterparty: 'Платёжный агент · демо',
    contract: 'AGENT-PAY-2026',
  },
  penalty: {
    name: 'Выплаты по неустойкам',
    block: 'penalties',
    flow: 'OCF',
    direction: 'out',
    owner: 'Юридическая служба',
    counterparty: 'Контрагент по соглашению · демо',
    contract: 'SETTLEMENT-2026',
  },
  interestPaid: {
    name: 'Выплаты процентов',
    block: 'debt',
    flow: 'OCF',
    direction: 'out',
    owner: 'Казначейство',
    counterparty: 'Банк А · демо',
    contract: 'LOAN-A',
  },
  interestReceived: {
    name: 'Поступления процентов',
    block: 'deposits',
    flow: 'OCF',
    direction: 'in',
    owner: 'Казначейство',
    counterparty: 'Банк Б · демо',
    contract: 'DEP-B',
  },
  profitTax: {
    name: 'Выплаты налога на прибыль',
    block: 'taxes',
    flow: 'OCF',
    direction: 'out',
    owner: 'Главный бухгалтер',
    counterparty: 'Налоговый расчёт · демо',
    contract: 'TAX-PROFIT',
  },
  vat: {
    name: 'Выплаты НДС',
    block: 'taxes',
    flow: 'OCF',
    direction: 'out',
    owner: 'Главный бухгалтер',
    counterparty: 'Налоговый расчёт · демо',
    contract: 'TAX-VAT',
  },
  ndfl: {
    name: 'Перечисления НДФЛ',
    block: 'taxes',
    flow: 'OCF',
    direction: 'out',
    owner: 'Главный бухгалтер',
    counterparty: 'Налоговый расчёт · демо',
    contract: 'TAX-NDFL',
  },
  propertyTax: {
    name: 'Налог на имущество',
    block: 'taxes',
    flow: 'OCF',
    direction: 'out',
    owner: 'Главный бухгалтер',
    counterparty: 'Налоговый расчёт · демо',
    contract: 'TAX-PROPERTY',
  },
  otherTax: {
    name: 'Прочие налоги',
    block: 'taxes',
    flow: 'OCF',
    direction: 'out',
    owner: 'Главный бухгалтер',
    counterparty: 'Налоговый расчёт · демо',
    contract: 'TAX-OTHER',
  },
  capex: {
    name: 'Оплата капитальной программы',
    block: 'investments',
    flow: 'ICF',
    direction: 'out',
    owner: 'Инвестиционный / технический директор',
    counterparty: 'Поставщик активов · демо',
    contract: 'CAPEX-2026',
  },
  depositOut: {
    name: 'Размещение тела депозита',
    block: 'deposits',
    flow: 'ICF',
    direction: 'out',
    owner: 'Казначейство',
    counterparty: 'Банк Б · демо',
    contract: 'DEP-B',
  },
  depositReturn: {
    name: 'Возврат тела депозита',
    block: 'deposits',
    flow: 'ICF',
    direction: 'in',
    owner: 'Казначейство',
    counterparty: 'Банк Б · демо',
    contract: 'DEP-B',
  },
  borrowing: {
    name: 'Привлечение кредита',
    block: 'debt',
    flow: 'CFF',
    direction: 'in',
    owner: 'Финансовый директор',
    counterparty: 'Банк А · демо',
    contract: 'LOAN-A',
  },
  repayment: {
    name: 'Погашение тела кредита',
    block: 'debt',
    flow: 'CFF',
    direction: 'out',
    owner: 'Финансовый директор',
    counterparty: 'Банк А · демо',
    contract: 'LOAN-A',
  },
  leasePrincipal: {
    name: 'Погашение тела лизинга',
    block: 'debt',
    flow: 'CFF',
    direction: 'out',
    owner: 'Финансовый директор',
    counterparty: 'Внешний лизингодатель · демо',
    contract: 'LEASE-X',
  },
};
export type CashEvent = {
  id: string;
  snapshotId: string;
  company: 'AL1';
  account: string;
  currency: 'RUB';
  amount: number;
  direction: 'in' | 'out';
  category: string;
  flow: 'OCF' | 'ICF' | 'CFF';
  date: string;
  scenario: 'plan' | 'actual' | 'forecast';
  contract: string;
  counterparty: string;
  owner: string;
  sourceRef: string;
  accrualMonth?: string;
  weekId?: string;
  critical: boolean;
};
export type FinanceMonth = {
  month: string;
  view: 'plan' | 'forecast';
  revenue: number;
  op: number;
  da: number;
  ocf: number;
  capex: number;
  arOpening: number;
  arClosing: number;
  apOpening: number;
  apClosing: number;
  costAccrued: number;
  cashCosts: number;
  collections: number;
  interestAccrued: number;
  interestPaid: number;
  interestIncome: number;
  interestReceived: number;
  taxAccrued: number;
  taxPaid: number;
  interestLiability: number;
  interestAsset: number;
  taxLiability: number;
};
export const financeAccounts = [
  {
    id: 'ACC-A',
    bank: 'Банк А · демо',
    name: 'Расчётный · RUB',
    currency: 'RUB',
    rate: 1,
    opening: 100,
    restricted: false,
  },
  {
    id: 'ACC-B',
    bank: 'Банк Б · демо',
    name: 'Валютный · USD',
    currency: 'USD',
    rate: 100,
    opening: 15,
    restricted: false,
  },
  {
    id: 'ACC-NSO',
    bank: 'Банк А · демо',
    name: 'НСО · RUB',
    currency: 'RUB',
    rate: 1,
    opening: 15,
    restricted: true,
  },
];
const split = (amount: number, n: number) => {
  const a = Array.from({ length: n }, () => r(amount / n));
  a[n - 1] = r(amount - fsum(a.slice(0, -1)));
  return a;
};
export function buildAl1Finance(data: ExecutiveSnapshot) {
  if (
    data.asOf.slice(0, 10) !== '2026-08-31' ||
    data.classification !== 'DEMO_SYNTHETIC' ||
    !data.commercial ||
    data.commercial.snapshotId !== data.snapshotId
  )
    throw Error('Finance requires compatible synthetic source');
  const e = data.entities.find((x) => x.id === 'AL1');
  if (!e) throw Error('AL1 missing');
  const econ = buildAl1Economics(data.commercial),
    events: CashEvent[] = [],
    months: FinanceMonth[] = [];
  for (const view of ['plan', 'forecast'] as const) {
    let ar = 180,
      ap = 320,
      interestLiability = 3.8,
      interestAsset = 0.25,
      taxLiability = 4;
    for (let i = 0; i < 12; i++) {
      const month = econMonths[i],
        f = econ.financial[i][view],
        prev = i
          ? econ.financial[i - 1][view]
          : { financeCost: 3.8, interestIncome: 0.25, tax: 4 };
      const value = (k: keyof ExecutiveEntity['monthly']) => {
        const m = e.monthly[k][i];
        return view === 'plan' ? m.plan : (m.actual ?? m.forecast ?? 0);
      };
      const revenue = value('revenue'),
        op = value('op'),
        da = value('da'),
        ocf = value('ocf'),
        capex = value('capex');
      const arClosing =
        view === 'plan'
          ? 180 + 5 * (i + 1)
          : i < 8
            ? 180 + 7.5 * (i + 1)
            : 240 - 20 * (i - 7);
      const collections = revenue + ar - arClosing,
        interestPaid = prev.financeCost,
        interestReceived = prev.interestIncome,
        taxPaid = Math.max(0, prev.tax);
      const cashCosts =
        collections + interestReceived - interestPaid - taxPaid - ocf;
      const costAccrued = revenue - op - da,
        apClosing = ap + costAccrued - cashCosts;
      interestLiability += f.financeCost - interestPaid;
      interestAsset += f.interestIncome - interestReceived;
      taxLiability += f.tax - taxPaid;
      if (cashCosts < 10 || apClosing < 0 || collections < 0)
        throw Error('Negative synthetic operating pool');
      months.push({
        month,
        view,
        revenue,
        op,
        da,
        ocf,
        capex,
        arOpening: ar,
        arClosing,
        apOpening: ap,
        apClosing,
        costAccrued,
        cashCosts,
        collections,
        interestAccrued: f.financeCost,
        interestPaid,
        interestIncome: f.interestIncome,
        interestReceived,
        taxAccrued: f.tax,
        taxPaid,
        interestLiability,
        interestAsset,
        taxLiability,
      });
      ar = arClosing;
      ap = apClosing;
      const slots =
        view === 'forecast' && i >= 8 && i <= 10
          ? e.weeks
              .filter((w) => w.date.startsWith(month))
              .map((w) => ({
                date: w.date,
                id: `PAY-${e.weeks.indexOf(w) + 1}`,
                net: w.movement,
              }))
          : [{ date: monthEnd(month), id: undefined, net: ocf - capex }];
      const fixed: Record<string, number> = {
        interestPaid,
        interestReceived,
        profitTax: taxPaid,
        vat: 2,
        vatIn: 2,
        ndfl: 1.2,
        propertyTax: 0.6,
        otherTax: 0.2,
        capex,
        borrowing: 24,
        repayment: 19,
        leasePrincipal: 5,
        depositOut: 15,
        depositReturn: 15,
      };
      const customerAmounts = split(collections, slots.length),
        capexAmounts = split(capex, slots.length);
      slots.forEach((slot, j) => {
        const targetOcf = slot.net + capexAmounts[j];
        const amounts = Object.fromEntries(
          Object.entries(fixed).map(([k, v]) => [k, split(v, slots.length)[j]]),
        );
        amounts.capex = capexAmounts[j];
        amounts.customers = customerAmounts[j];
        const pool =
          amounts.customers +
          amounts.interestReceived -
          amounts.interestPaid -
          amounts.profitTax -
          targetOcf -
          amounts.ndfl -
          amounts.propertyTax -
          amounts.otherTax;
        if (pool < 0) throw Error('Negative weekly operating pool');
        const repairTotal =
          slot.id === 'PAY-1' ? 25 : slot.id === 'PAY-5' ? 11 : 0;
        let used = repairTotal;
        const remainingPool = pool - repairTotal;
        if (remainingPool < 0)
          throw Error('Repair commitment exceeds operating pool');
        for (const [k, w] of Object.entries({
          fuel: 0.36,
          airport: 0.17,
          maintenance: 0.15,
          payroll: 0.17,
          agentOp: 0.025,
          agentPay: 0.005,
          penalty: 0.002,
        })) {
          amounts[k] = r(remainingPool * w);
          used += amounts[k];
        }
        amounts.suppliers = r(pool - used);
        amounts.maintenance += repairTotal;
        for (const [category, amount] of Object.entries(amounts)) {
          const cat = cashCategories[category];
          const base: CashEvent = {
            id: `FIN-${view === 'plan' ? 'P' : 'F'}-${month}-${j + 1}-${category}`,
            snapshotId: data.snapshotId,
            company: 'AL1',
            account: 'ACC-A',
            currency: 'RUB',
            amount: r(amount),
            direction: cat.direction,
            category,
            flow: cat.flow,
            date: slot.date,
            scenario: view === 'plan' ? 'plan' : i < 8 ? 'actual' : 'forecast',
            contract: cat.contract,
            counterparty: cat.counterparty,
            owner: cat.owner,
            sourceRef: `DEMO-${view === 'plan' ? 'BUDGET' : i < 8 ? 'STATEMENT' : 'SCHEDULE'}-${month}-${j + 1}-${category}`,
            accrualMonth: [
              'interestPaid',
              'interestReceived',
              'profitTax',
            ].includes(category)
              ? i
                ? econMonths[i - 1]
                : '2025-12'
              : undefined,
            weekId: slot.id,
            critical: [
              'fuel',
              'airport',
              'maintenance',
              'payroll',
              'capex',
              'leasePrincipal',
            ].includes(category),
          };
          if (category === 'customers') {
            const customers = data.al1?.debt;
            if (!customers || customers.length !== 5)
              throw Error('Customer reference missing');
            let allocated = 0;
            customers.forEach((d, index) => {
              const part =
                index === customers.length - 1
                  ? r(amount - allocated)
                  : r((amount * d.amount) / 240);
              allocated += part;
              events.push({
                ...base,
                id: base.id + '-' + d.id,
                amount: part,
                contract: d.id,
                counterparty: d.name + ' · демо',
                sourceRef: base.sourceRef + '-' + d.id,
              });
            });
          } else if (category === 'maintenance' && repairTotal) {
            const repairs =
              slot.id === 'PAY-1'
                ? ([
                    ['MX-01', 18],
                    ['MX-02', 7],
                  ] as const)
                : ([['MX-03', 11]] as const);
            events.push({ ...base, amount: r(amount - repairTotal) });
            for (const [id, cost] of repairs)
              events.push({
                ...base,
                id: base.id + '-' + id,
                amount: cost,
                contract: id,
                sourceRef: base.sourceRef + '-' + id,
              });
          } else events.push(base);
        }
      });
    }
  }
  return {
    snapshotId: data.snapshotId,
    method: financeMethod,
    classification: 'DEMO_SYNTHETIC' as const,
    asOf: data.asOf.slice(0, 10),
    events,
    months,
    reserve: e.cashFloor,
    accounts: financeAccounts,
    creditLine: 80,
    creditLineStatus: 'Учебный лимит; доступность банком не подтверждена',
    weeks: e.weeks.map((w) => ({
      date: w.date,
      id: `PAY-${e.weeks.indexOf(w) + 1}`,
    })),
  };
}
export type Al1Finance = ReturnType<typeof buildAl1Finance>;
// Old technical links PAY-n stay valid and now point to the same cash ledger.
export function attachFinance(data: ExecutiveSnapshot) {
  const f = buildAl1Finance(data);
  data.finance = f;
  if (data.al1) {
    const weeks = financeWeeks(f);
    data.al1.payments = weeks.map((w, i) => ({
      id: w.id,
      date: w.date,
      opening: i
        ? weeks[i - 1].balance
        : fsum(bankBalances(f, f.asOf)!.map((a) => a.total)),
      receipts: w.receipts,
      payments: w.payments,
      closing: w.balance,
    }));
    for (const record of data.al1.records) {
      const w = data.al1.payments.find((p) => p.id === record.id);
      if (!w) continue;
      const money = (n: number) =>
        new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n) +
        ' млн ₽';
      record.values = record.values.map((v) => ({
        ...v,
        value:
          v.label === 'Поступления'
            ? money(w.receipts)
            : v.label === 'Все платежи'
              ? money(w.payments)
              : v.label === 'Остальные платежи'
                ? money(w.payments - (w.id === 'PAY-1' ? 25 : 11))
                : v.label === 'Метод'
                  ? 'Единый синтетический реестр FIN-AL1-v0.20. Все платежи уже включают ремонт; не добавлять повторно.'
                  : v.value,
      }));
    }
  }
  return f;
}
export const signedCash = (x: CashEvent) =>
  x.direction === 'in' ? x.amount : -x.amount;
export function financeEvents(f: Al1Finance, s: CashScope) {
  if (
    (s.account && !f.accounts.some((a) => a.id === s.account)) ||
    (s.category && !cashCategories[s.category]) ||
    (s.contract && !f.events.some((x) => x.contract === s.contract)) ||
    !['plan', 'actual', 'forecast'].includes(s.view)
  )
    throw Error('Unknown cash scope');
  if (
    !econMonths.includes(s.start) ||
    !econMonths.includes(s.end) ||
    s.start > s.end
  )
    throw Error('Invalid cash period');
  return f.events.filter(
    (x) =>
      (s.view === 'plan'
        ? x.scenario === 'plan'
        : s.view === 'actual'
          ? x.scenario === 'actual'
          : x.scenario !== 'plan') &&
      x.date.slice(0, 7) >= s.start &&
      x.date.slice(0, 7) <= s.end &&
      (!s.account || x.account === s.account) &&
      (!s.category || x.category === s.category) &&
      (!s.contract || x.contract === s.contract),
  );
}
export function financeTotal(
  f: Al1Finance,
  s: CashScope,
  flow?: CashEvent['flow'],
  direction?: CashEvent['direction'],
) {
  const rows = financeEvents(f, s);
  if (s.view === 'actual' && s.start > f.asOf.slice(0, 7)) return null;
  return r(
    fsum(
      rows
        .filter(
          (x) =>
            (!flow || x.flow === flow) &&
            (!direction || x.direction === direction),
        )
        .map((x) => (direction ? x.amount : signedCash(x))),
    ),
  );
}
export function bankBalances(
  f: Al1Finance,
  date: string,
  view: CashView = 'forecast',
) {
  if (
    !/^2026-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date ||
    date < '2026-01-01' ||
    date > '2026-12-31' ||
    (view === 'actual' && date > f.asOf)
  )
    return null;
  return f.accounts.map((a) => {
    const total = r(
      a.opening +
        fsum(
          f.events
            .filter(
              (x) =>
                x.account === a.id &&
                x.date <= date &&
                (view === 'plan'
                  ? x.scenario === 'plan'
                  : x.scenario !== 'plan'),
            )
            .map(signedCash),
        ),
    );
    return {
      ...a,
      total,
      native: total / a.rate,
      available: a.restricted ? 0 : total,
    };
  });
}
export function financeWeeks(f: Al1Finance) {
  return f.weeks.map((w) => {
    const rows = f.events.filter(
        (x) => x.scenario === 'forecast' && x.weekId === w.id,
      ),
      accounts = bankBalances(f, w.date)!;
    return {
      ...w,
      receipts: r(
        fsum(rows.filter((x) => x.direction === 'in').map((x) => x.amount)),
      ),
      payments: r(
        fsum(rows.filter((x) => x.direction === 'out').map((x) => x.amount)),
      ),
      balance: r(fsum(accounts.map((x) => x.total))),
      available: r(fsum(accounts.map((x) => x.available))),
      reserve: f.reserve,
    };
  });
}
export const financeBlocks = [
  'operations',
  'banks',
  'debt',
  'deposits',
  'investments',
  'settlements',
  'commissions',
  'penalties',
  'taxes',
  'bridge',
] as const;
export function contractBalance(
  f: Al1Finance,
  contract: string,
  date: string,
  view: CashView = 'forecast',
) {
  if (
    !['LOAN-A', 'LEASE-X', 'DEP-B'].includes(contract) ||
    !bankBalances(f, date, view)
  )
    return null;
  const initial =
    contract === 'LOAN-A'
      ? 420
      : contract === 'LEASE-X'
        ? 60
        : contract === 'DEP-B'
          ? 60
          : 0;
  return r(
    initial +
      fsum(
        f.events
          .filter(
            (x) =>
              x.contract === contract &&
              x.date <= date &&
              (view === 'plan'
                ? x.scenario === 'plan'
                : x.scenario !== 'plan') &&
              [
                'borrowing',
                'repayment',
                'leasePrincipal',
                'depositOut',
                'depositReturn',
              ].includes(x.category),
          )
          .map((x) => signedCash(x) * (contract === 'DEP-B' ? -1 : 1)),
      ),
  );
}

for (const [id, c] of Object.entries(cashCategories)) {
  financeMetrics[id] ||= {
    name: c.name,
    definition: `${c.direction === 'in' ? 'Поступления' : 'Выплаты'} по статье «${c.name}» за выбранный период, по дате денежного события. Поток ${c.flow}. План, учебный факт и будущий прогноз разделены; суммы уже включены в соответствующий общий поток.`,
    owner: c.owner,
  };
}
financeMetrics.interestPaid.definition =
  'Денежные выплаты процентов: факт — уплаченные, план — бюджетные, будущий прогноз — ожидаемые. В демо имеют месячный лаг к начислениям экономики. Не включают погашение тела кредита; в учебном профиле входят в OCF.';
financeMetrics.interestReceived.definition =
  'Денежные поступления процентов: факт — полученные, план — бюджетные, будущий прогноз — ожидаемые. Отдельно от возврата тела депозита. В демо имеют месячный лаг к процентному доходу P&L и входят в OCF.';
financeMetrics.profitTax.definition =
  'Выплаты налога на прибыль по учебному календарю с лагом месяц к начислению P&L: факт — перечисленные, план — бюджетные, будущий прогноз — ожидаемые. Оплата и налоговый расход периода могут отличаться; это не налоговая декларация.';
