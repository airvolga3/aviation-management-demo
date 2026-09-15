'use client';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  ClipboardCheck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ExecutiveSnapshot } from '@/lib/executive-model';
import { ownerHref, type OwnerRoute } from '@/lib/owner-model';
import {
  sqEffectiveness,
  sqLegs,
  sqMatch,
  sqMetrics,
  sqMonths,
  sqRecords,
  sqSummary,
  type SqRecord,
  type SqScope,
} from '@/lib/al1-safety-model';
import { MetricHelp } from './metric-help';

const fmt = (v: number | null | undefined, d = 1) =>
  v === null || v === undefined
    ? '—'
    : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: d }).format(v);
const month = (m: string) =>
  [
    'Янв',
    'Фев',
    'Мар',
    'Апр',
    'Май',
    'Июн',
    'Июл',
    'Авг',
    'Сен',
    'Окт',
    'Ноя',
    'Дек',
  ][Number(m.slice(5, 7)) - 1];
const fleetName = (f?: string) =>
  f === 'AL1-AN124' ? 'Ан-124' : f === 'AL1-IL76' ? 'Ил-76' : 'Общекомпанийный';
const categoryName: Record<string, string> = {
  accident: 'Происшествие',
  serious: 'Серьёзный инцидент',
  incident: 'Инцидент',
  deviation: 'SPI · отклонение',
  ground: 'Наземное повреждение',
  SAFA: 'SAFA',
  REGULATOR: 'Регулятор',
  INTERNAL: 'Внутренний аудит',
  unacceptable: 'Неприемлемый',
  review: 'Требует оценки',
  measure: 'Корректирующая мера',
  integrity: 'Сохранность',
  claim: 'Претензия',
};
function Help({ id }: { id: string }) {
  return <MetricHelp catalog="safety" metric={id} />;
}

export default function Al1SafetyWorkspace({
  data,
  route,
}: {
  data: ExecutiveSnapshot;
  route: OwnerRoute;
}) {
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(0);
  const f = data.safety,
    k = route.kpi || '',
    scope: SqScope = {
      start: route.start || '2026-01',
      end: route.end || '2026-12',
      fleet: route.fleet,
      aircraft: route.aircraft,
    };
  const base: OwnerRoute = {
    page: 'company',
    company: 'AL1',
    metric: 'safety',
    snapshot: data.snapshotId,
    start: scope.start,
    end: scope.end,
    fleet: scope.fleet,
    aircraft: scope.aircraft,
    kpi: k || undefined,
    category: route.category,
  };
  const url = (c: Partial<OwnerRoute> = {}) => {
    const next = { ...base, ...c };
    if ('kpi' in c && c.kpi !== base.kpi && !('category' in c))
      next.category = undefined;
    return ownerHref(next);
  };
  const nav = (c: Partial<OwnerRoute>) => {
    window.location.assign(url(c));
    setSearch('');
    setPage(0);
  };
  const reset = ownerHref({
    page: 'company',
    company: 'AL1',
    metric: 'safety',
    snapshot: data.snapshotId,
  });
  const invalid =
    !f ||
    f.snapshotId !== data.snapshotId ||
    (route.snapshot && route.snapshot !== data.snapshotId) ||
    !sqMonths.includes(scope.start) ||
    !sqMonths.includes(scope.end) ||
    scope.start > scope.end ||
    (k && !Object.hasOwn(sqMetrics, k)) ||
    (scope.fleet &&
      !['AL1-IL76', 'AL1-AN124', 'COMPANY'].includes(scope.fleet)) ||
    (scope.aircraft &&
      !f.legs.some(
        (l) =>
          l.aircraftId === scope.aircraft &&
          sqMatch(l, { ...scope, aircraft: undefined }),
      )) ||
    (route.row && route.row !== 'source') ||
    (route.row && !route.id) ||
    (route.category &&
      !(['findings', 'inspections', 'safa'].includes(k)
        ? ['SAFA', 'REGULATOR', 'INTERNAL'].includes(route.category)
        : ['service', 'coverage', 'forecast'].includes(k) &&
          route.category === 'ALL'));
  if (invalid || !f)
    return (
      <section className="op-panel">
        <h2>Срез безопасности недоступен</h2>
        <p>
          Период, тип, борт или версия не соответствуют данным. Общая цифра не
          подставлена вместо выбранной.
        </p>
        <a href={reset}>Открыть полный срез АК1</a>
      </section>
    );
  const s = sqSummary(f, scope),
    all = sqRecords(f, scope),
    legs = sqLegs(f, scope);
  const record = route.id
    ? all.find(
        (r) =>
          r.id === route.id &&
          (!route.category || r.category === route.category),
      )
    : undefined;
  if (route.id && !record)
    return (
      <section className="op-panel">
        <h2>Запись не найдена в выбранном срезе</h2>
        <p>
          Запись могла относиться к другому периоду, типу или борту. Фильтры не
          сброшены автоматически.
        </p>
        <a href={url()}>Вернуться к показателю</a> ·{' '}
        <a href={reset}>Полный срез АК1</a>
      </section>
    );
  const cross = (metric: string, id?: string, kpi?: string) =>
    ownerHref({
      ...base,
      metric,
      id,
      kpi,
      category: undefined,
      fleet: scope.fleet === 'COMPANY' ? undefined : scope.fleet,
    });
  const primary = [
    'severe',
    'risks',
    'overdue',
    'service',
    'integrity',
    'findings',
  ];
  const listKeys = [
    'events',
    'deviations',
    'ground',
    'coverage',
    'risks',
    'safety-actions',
    'inspections',
    'service',
    'forecast',
    'integrity',
    'claims',
    'findings',
    'quality-actions',
  ];
  const card = (id: string, value: string, note: string, tone = '') => (
    <article key={id} className={'sq-card ' + tone}>
      <div className="sq-card-title">
        <a href={url({ kpi: id })}>{sqMetrics[id].name}</a>
        <Help id={id} />
      </div>
      <a className="sq-card-value" href={url({ kpi: id })}>
        {value}
        <ArrowUpRight size={20} />
      </a>
      <p>{note}</p>
    </article>
  );
  const controls = (
    <div className="sq-controls">
      <label>
        Период с
        <select
          aria-label="Безопасность: период с"
          value={scope.start}
          onChange={(e) =>
            nav({
              start: e.target.value,
              end: e.target.value > scope.end ? e.target.value : scope.end,
              category: undefined,
            })
          }
        >
          {sqMonths.map((m) => (
            <option key={m} value={m}>
              {month(m)} 2026
            </option>
          ))}
        </select>
      </label>
      <label>
        Период по
        <select
          aria-label="Безопасность: период по"
          value={scope.end}
          onChange={(e) =>
            nav({
              end: e.target.value,
              start:
                e.target.value < scope.start ? e.target.value : scope.start,
              category: undefined,
            })
          }
        >
          {sqMonths.map((m) => (
            <option key={m} value={m}>
              {month(m)} 2026
            </option>
          ))}
        </select>
      </label>
      <label>
        Тип ВС
        <select
          aria-label="Безопасность: тип ВС"
          value={scope.fleet || ''}
          onChange={(e) =>
            nav({
              fleet: e.target.value || undefined,
              aircraft: undefined,
              category: undefined,
            })
          }
        >
          <option value="">Вся авиакомпания</option>
          <option value="AL1-IL76">Ил-76</option>
          <option value="AL1-AN124">Ан-124</option>
          <option value="COMPANY">Общекомпанийные записи</option>
        </select>
      </label>
      <label>
        Борт
        <select
          aria-label="Безопасность: борт"
          value={scope.aircraft || ''}
          disabled={scope.fleet === 'COMPANY'}
          onChange={(e) =>
            nav({ aircraft: e.target.value || undefined, category: undefined })
          }
        >
          <option value="">Все борта</option>
          {[
            ...new Map(
              f.legs
                .filter((l) => !scope.fleet || l.fleet === scope.fleet)
                .map((l) => [l.aircraftId, l]),
            ).values(),
          ].map((l) => (
            <option key={l.aircraftId}>{l.aircraftId}</option>
          ))}
        </select>
      </label>
      <a href={reset}>Сбросить отбор</a>
    </div>
  );
  const stateNote = (
    <p className="sq-caption">
      События, проверки, груз и рейсы: {month(scope.start)}–{month(scope.end)}{' '}
      2026; факт только по 31 августа. Риски, открытые замечания и меры:
      состояние на 31.08.2026 независимо от периода — истории статусов пока нет.
    </p>
  );
  const header = (
    <>
      <header className="sq-heading">
        <div>
          <p className="sq-eyebrow">AIRLINE 1 / SAFETY & QUALITY</p>
          <h2>Безопасность и качество</h2>
          <p>
            Два самостоятельных контура. Событие → причина → ответственный →
            мера → проверка эффекта.
          </p>
        </div>
        <span className="sq-demo">
          СИНТЕТИЧЕСКИЙ СЦЕНАРИЙ
          <br />
          {f.method}
        </span>
      </header>
      {controls}
      {stateNote}
    </>
  );
  const foot = (
    <footer className="sq-foot">
      {f.method} · {f.snapshotId}. Ответственные пока обозначены ролями, а не
      реальными назначениями. Новые SQ-записи — отдельные регистры; SPI,
      SAFE и CLAIM используют прежние источники. Экран не разрешает выпуск ВС и
      не заменяет расследование или решение регулятора.
    </footer>
  );
  const monthly = sqMonths
    .filter((m) => m >= scope.start && m <= scope.end)
    .map((m) => {
      const x = sqSummary(f, { ...scope, start: m, end: m });
      return {
        month: m,
        label: month(m),
        incident: x.incidents,
        ground: x.ground,
        spi: x.noFact ? null : x.spi,
        service: x.service,
        missed: x.noFact ? null : x.missed,
        observed: x.observed,
        coverage: x.fdm,
        future: x.future,
        risk: x.futureRisk,
      };
    });
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke="var(--line)" />
      <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
      <YAxis
        allowDecimals={false}
        width={40}
        tick={{ fill: 'var(--muted)', fontSize: 12 }}
      />
      <Tooltip
        contentStyle={{
          background: 'var(--paper)',
          borderColor: 'var(--line)',
          color: 'var(--ink)',
          borderRadius: 12,
        }}
      />
    </>
  );
  const charts = (
    <div className="sq-charts">
      <section className="sq-panel">
        <div className="sq-title">
          <h3>Что происходило по месяцам</h3>
          <Help id="events" />
        </div>
        <p className="sq-caption">
          Количество записей. SPI — отдельно от авиационных инцидентов.
        </p>
        <figure
          className="sq-chart"
          aria-label="Месячные инциденты, отклонения SPI и наземные повреждения. Точные числа раскрываются ниже."
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={1}
            initialDimension={{ width: 400, height: 230 }}
          >
            <BarChart data={monthly}>
              {axes}
              <Bar
                dataKey="incident"
                name="Инциденты"
                fill="var(--sq-red)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="spi"
                name="SPI-отклонения"
                fill="var(--blue)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="ground"
                name="На земле"
                fill="var(--sq-teal)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </figure>
        <div className="sq-legend">
          <span>
            <i style={{ background: 'var(--sq-red)' }} />
            Инциденты
          </span>
          <span>
            <i style={{ background: 'var(--blue)' }} />
            SPI
          </span>
          <span>
            <i style={{ background: 'var(--sq-teal)' }} />
            На земле
          </span>
        </div>
        <a href={url({ kpi: 'events' })}>Открыть события и точные значения →</a>
      </section>
      <section className="sq-panel">
        <div className="sq-title">
          <h3>Исполнение коммерческой программы</h3>
          <Help id="service" />
        </div>
        <p className="sq-caption">
          % заданий без нарушения · рейсовый прокси, не договорный DAP.
        </p>
        <figure
          className="sq-chart"
          aria-label="Доля закрытых коммерческих заданий без нарушения. Будущий факт отсутствует."
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={1}
            initialDimension={{ width: 400, height: 230 }}
          >
            <LineChart data={monthly}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, 100]}
                unit="%"
                width={45}
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--paper)',
                  borderColor: 'var(--line)',
                  borderRadius: 12,
                }}
              />
              <Line
                dataKey="service"
                name="Без нарушения, %"
                stroke="var(--sq-teal)"
                strokeWidth={3}
                dot={{ r: 4 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </figure>
        <p className="sq-caption">
          Цель не утверждена — линия плана не выдумана. Будущие ресурсные риски
          раскрываются отдельно.
        </p>
        <a href={url({ kpi: 'service' })}>Нарушения, причины и рейсы →</a>
      </section>
    </div>
  );
  const metricFor = (r: SqRecord) =>
    r.kind === 'action'
      ? r.domain === 'safety'
        ? 'safety-actions'
        : 'quality-actions'
      : r.kind === 'event'
        ? 'events'
        : (
            {
              risk: 'risks',
              inspection: 'inspections',
              finding: 'findings',
              damage: 'integrity',
              claim: 'claims',
            } as Record<string, string>
          )[r.kind];
  if (record) {
    const r = record,
      legacy = f.legacyIssues.find((x) => x.id === r.id);
    return (
      <div className="sq-workspace">
        {header}
        <a
          className="al1-return"
          href={url({
            kpi: k || metricFor(r),
            id: route.row ? r.id : undefined,
          })}
        >
          <ArrowLeft size={16} />
          {route.row ? 'К записи' : 'К списку показателя'}
        </a>
        <section className="sq-panel">
          <p className="sq-eyebrow">
            {route.row
              ? 'ИСТОЧНИК / УЧЕБНАЯ КАРТОЧКА ЗАПИСИ'
              : r.domain === 'safety'
                ? 'БЕЗОПАСНОСТЬ'
                : 'КАЧЕСТВО'}{' '}
            · {r.id}
          </p>
          <h2>{r.title}</h2>
          <p className="sq-status">{r.status}</p>
          <dl className="sq-detail">
            <div>
              <dt>Дата события / состояния</dt>
              <dd>
                {r.date}
                {['action', 'risk', 'finding'].includes(r.kind)
                  ? ' · состояние на 31.08'
                  : ''}
              </dd>
            </div>
            <div>
              <dt>Классификация</dt>
              <dd>
                {categoryName[r.category] || r.category}
                {r.grade ? ' · категория ' + r.grade : ''}
                {r.repeated ? ' · повторное замечание' : ''}
              </dd>
            </div>
            <div>
              <dt>Объект</dt>
              <dd>
                {fleetName(r.fleet)}
                <br />
                {r.aircraftId || 'Не распределяется по бортам'}
                {r.flightId && (
                  <>
                    <br />
                    {r.flightId}
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>Ответственный за разбор и действие</dt>
              <dd>
                {r.owner}
                <small>
                  роль; персональное назначение не загружено.
                </small>
              </dd>
            </div>
            {r.due && (
              <div>
                <dt>
                  Срок{' '}
                  {r.kind === 'action' ? 'исполнения' : 'ответа / устранения'}
                </dt>
                <dd>
                  {r.due}
                  {!r.implemented && !r.verified && r.due < f.asOf
                    ? ' · истёк на дату среза'
                    : ''}
                </dd>
              </div>
            )}
            {r.kind === 'action' && (
              <>
                <div>
                  <dt>
                    Исполнение <Help id={r.domain + '-actions'} />
                  </dt>
                  <dd>{r.implemented ? 'Выполнено' : 'Не завершено'}</dd>
                </div>
                <div>
                  <dt>
                    Проверка эффекта <Help id="effectiveness" />
                  </dt>
                  <dd>
                    {r.verified
                      ? 'Подтверждён ' + r.verifiedDate
                      : 'Не подтверждена'}
                    <small>
                      Срок проверки:{' '}
                      {r.verificationDue ||
                        'не предоставлен; срок исполнения не подменяет его'}
                    </small>
                  </dd>
                </div>
              </>
            )}
            {r.amount !== undefined && (
              <div>
                <dt>
                  Заявленное требование <Help id="claims" />
                </dt>
                <dd>{fmt(r.amount, 2)} млн ₽ · не признанный расход</dd>
              </div>
            )}
          </dl>
          <div className="sq-decision">
            <h3>Причина / что известно</h3>
            <p>{r.cause}</p>
            <h3>Рекомендуемый следующий шаг</h3>
            <p>{r.next}</p>
            <small>
              Подсказка сценария, не автоматически назначенное решение и не
              установление вины.
            </small>
          </div>
          {route.row ? (
            <>
              <h3>Основание и происхождение</h3>
              <dl className="sq-detail">
                <div>
                  <dt>Источник</dt>
                  <dd>{r.source}</dd>
                </div>
                <div>
                  <dt>Ключ записи</dt>
                  <dd>{r.id}</dd>
                </div>
                <div>
                  <dt>Единый срез</dt>
                  <dd>
                    {f.snapshotId} / {f.method}
                  </dd>
                </div>
              </dl>
              <p>
                Это доступное в прототипе конечное основание — структурированная
                синтетическая запись, не скан реального документа. Корпоративные
                ссылки, права доступа и защищённые сообщения подключает IT.
                Персональные сообщения по безопасности не раскрываются
                автоматически всем ролям.
              </p>
            </>
          ) : (
            <a
              className="sq-source"
              href={url({ kpi: k || metricFor(r), id: r.id, row: 'source' })}
            >
              Открыть основание и определение источника{' '}
              <ArrowUpRight size={16} />
            </a>
          )}
          <div className="sq-links">
            {r.kind === 'event' && !r.links.length && (
              <p className="sq-callout">
                Связь с корректирующей мерой не предоставлена. Это пробел
                данных, а не доказательство отсутствия мер: службе безопасности
                необходимо связать разбор, решение и проверку эффекта.
              </p>
            )}
            {r.links.map((id) => {
              const x = f.records.find((x) => x.id === id);
              if (!x) return null;
              const otherObject = !sqMatch(x, scope);
              const otherPeriod =
                !['action', 'risk', 'finding'].includes(x.kind) &&
                (x.date.slice(0, 7) < scope.start ||
                  x.date.slice(0, 7) > scope.end);
              const otherSource =
                route.category && x.category !== route.category;
              const widened = otherObject || otherPeriod || otherSource;
              return x ? (
                <a
                  key={id}
                  href={url({
                    kpi: metricFor(x),
                    id: x.id,
                    fleet: otherObject ? undefined : scope.fleet,
                    aircraft: otherObject ? undefined : scope.aircraft,
                    start:
                      otherPeriod && x.date.slice(0, 7) < scope.start
                        ? x.date.slice(0, 7)
                        : scope.start,
                    end:
                      otherPeriod && x.date.slice(0, 7) > scope.end
                        ? x.date.slice(0, 7)
                        : scope.end,
                    category: otherSource ? undefined : route.category,
                  })}
                >
                  {x.title} · {id} →
                  {widened && (
                    <small>
                      Открыть в расширенном отборе:{' '}
                      {otherObject ? 'снять фильтры типа / борта; ' : ''}
                      {otherPeriod ? 'включить дату основания; ' : ''}
                      {otherSource ? 'снять отбор источника' : ''}
                    </small>
                  )}
                </a>
              ) : null;
            })}
            {r.flightId && (
              <a href={cross('production', r.flightId, 'flights')}>
                Открыть исходный рейс в производстве →
              </a>
            )}
            {legacy?.link && (
              <a
                href={cross(
                  legacy.link.startsWith('MX') ? 'technical' : 'people',
                  legacy.link,
                )}
              >
                Связанное основание · {legacy.link} →
              </a>
            )}
          </div>
        </section>
        {foot}
      </div>
    );
  }
  const catalogue = (
    <nav className="sq-nav" aria-label="Показатели безопасности и качества">
      <a className={!k ? 'active' : ''} href={url({ kpi: undefined })}>
        Обзор блока
      </a>
      {listKeys.map((id) => (
        <a
          className={k === id ? 'active' : ''}
          key={id}
          href={url({ kpi: id })}
        >
          {sqMetrics[id].name}
        </a>
      ))}
    </nav>
  );
  if (!k)
    return (
      <div className="sq-workspace">
        {header}
        {s.unacceptable > 0 && (
          <a className="sq-alert" href={url({ kpi: 'risks' })}>
            <ShieldAlert />
            <span>
              <strong>Есть неприемлемый риск в расчёте.</strong>{' '}
              Требуется решение по барьеру безопасности; хороший финансовый
              результат не снимает ограничение.
            </span>
            <ArrowUpRight />
          </a>
        )}
        <section>
          <div className="sq-domain">
            <ShieldCheck />
            <div>
              <h3>Безопасность полётов</h3>
              <p>
                Серьёзность событий, действующие риски и выполнение защитных
                мер.
              </p>
            </div>
          </div>
          <div className="sq-cards">
            {card(
              'severe',
              fmt(s.accidents) + ' / ' + fmt(s.serious),
              'Происшествия / серьёзные инциденты. Все инциденты: ' +
                fmt(s.incidents) +
                '.',
            )}
            {card(
              'risks',
              fmt(s.unacceptable),
              'Неприемлемых на 31.08 · требуют оценки: ' + s.unassessed,
              s.unacceptable ? 'attention' : '',
            )}
            {card(
              'overdue',
              fmt(s.criticalOverdue),
              'Просроченных критических мер · открытых мер безопасности: ' +
                s.safetyOpen,
            )}
          </div>
        </section>
        <section>
          <div className="sq-domain">
            <ClipboardCheck />
            <div>
              <h3>Качество исполнения</h3>
              <p>
                Обязательства перед заказчиком, сохранность и контроль
                процессов.
              </p>
            </div>
          </div>
          <div className="sq-cards">
            {card(
              'service',
              fmt(s.service) + (s.service === null ? '' : '%'),
              fmt(s.obligations - s.missed) +
                ' из ' +
                fmt(s.obligations) +
                ' заданий без нарушения · рейсовый прокси, не DAP',
            )}
            {card(
              'integrity',
              fmt(s.damages),
              'Подтверждённых актов. Претензии не приравниваются к дефектам.',
            )}
            {card(
              'findings',
              fmt(s.findingsOpen),
              'Открытых замечаний категорий 2/3 на 31.08 · разные источники проверок',
              'attention',
            )}
          </div>
        </section>
        {charts}
        <section className="sq-panel">
          <h3>Дополнительный контроль</h3>
          <div className="sq-secondary">
            {[
              ['deviations', fmt(s.spiRate, 2) + ' / 1000'],
              ['coverage', fmt(s.fdm) + '%'],
              ['claims', fmt(s.claims)],
              ['inspections', fmt(s.inspections)],
              ['ground', fmt(s.ground)],
              ['forecast', fmt(s.futureRisk) + ' / ' + fmt(s.future)],
              ['safety-actions', fmt(s.safetyOpen) + ' открыто'],
              [
                'quality-actions',
                fmt(
                  sqRecords(f, scope, 'action').filter(
                    (r) => r.domain === 'quality' && !r.implemented,
                  ).length,
                ) + ' не завершено',
              ],
            ].map(([id, value]) => (
              <div key={id}>
                <a href={url({ kpi: id })}>
                  <span>{sqMetrics[id].name}</span>
                  <strong>{value}</strong>
                </a>
                <Help id={id} />
              </div>
            ))}
          </div>
        </section>
        <section className="sq-panel">
          <h3>Что пока нельзя оценивать достоверно</h3>
          <div className="sq-methods">
            {['index', 'safa', 'dap'].map((id) => (
              <a key={id} href={url({ kpi: id })}>
                <strong>{sqMetrics[id].name}</strong>
                <span>{sqMetrics[id].unit}</span>
                <ArrowUpRight size={18} />
              </a>
            ))}
          </div>
        </section>
        {foot}
      </div>
    );
  const byCategory = (r: SqRecord) =>
    !route.category || r.category === route.category;
  let rows: SqRecord[] = [];
  if (['severe', 'events'].includes(k))
    rows = all.filter(
      (r) =>
        r.kind === 'event' &&
        ['accident', 'serious', 'incident'].includes(r.category),
    );
  if (k === 'deviations') rows = all.filter((r) => r.category === 'deviation');
  if (k === 'ground') rows = all.filter((r) => r.category === 'ground');
  if (k === 'risks') rows = all.filter((r) => r.kind === 'risk');
  if (
    ['overdue', 'safety-actions', 'quality-actions', 'effectiveness'].includes(
      k,
    )
  )
    rows = all.filter(
      (r) =>
        r.kind === 'action' &&
        (k === 'effectiveness' ||
          r.domain === (k === 'quality-actions' ? 'quality' : 'safety')),
    );
  if (k === 'overdue')
    rows = rows.filter(
      (r) => r.critical && !r.implemented && !!r.due && r.due < f.asOf,
    );
  if (k === 'integrity') rows = all.filter((r) => r.kind === 'damage');
  if (k === 'claims') rows = all.filter((r) => r.kind === 'claim');
  if (['findings', 'inspections', 'safa'].includes(k))
    rows = all.filter(
      (r) =>
        r.kind === (k === 'findings' ? 'finding' : 'inspection') &&
        byCategory(r) &&
        (k !== 'safa' || r.category === 'SAFA'),
    );
  const q = search.toLocaleLowerCase('ru-RU');
  const filtered = rows.filter((r) =>
    [r.id, r.title, r.owner, r.status, r.aircraftId, categoryName[r.category]]
      .join(' ')
      .toLocaleLowerCase('ru-RU')
      .includes(q),
  );
  const flightList = legs.filter((l) =>
    k === 'coverage'
      ? l.status === 'COMPLETED'
      : k === 'forecast'
        ? l.status === 'FORECAST' && !l.positioning
        : !l.positioning && l.status !== 'FORECAST',
  );
  const issueFlights = flightList.filter((l) =>
    k === 'coverage'
      ? !l.fdmValid
      : k === 'forecast'
        ? !l.crewAssigned || l.repairs.length > 0
        : l.commitmentMiss,
  );
  const flightFiltered = (
    route.category === 'ALL' ? flightList : issueFlights
  ).filter((l) =>
    [
      l.flightId,
      l.aircraftId,
      l.status,
      l.commitmentMiss ? 'нарушение' : 'без нарушения',
      l.fdmValid ? 'FDM пригодна' : 'FDM нет',
    ]
      .join(' ')
      .toLocaleLowerCase('ru-RU')
      .includes(q),
  );
  const flightMode = ['coverage', 'forecast', 'service'].includes(k),
    methods = ['index', 'dap'].includes(k);
  const count = flightMode ? flightFiltered.length : filtered.length,
    pages = Math.max(1, Math.ceil(count / 20));
  const notes: Record<string, string> = {
    severe:
      'Происшествия: ' +
      fmt(s.accidents) +
      ' · серьёзные инциденты: ' +
      fmt(s.serious) +
      ' · инциденты всего: ' +
      fmt(s.incidents) +
      '. Серьёзные входят в инциденты всего.',
    events:
      'Инциденты всего: ' +
      fmt(s.incidents) +
      '. Условные SPI-отклонения и повреждения на земле раскрываются отдельными списками.',
    deviations:
      'SPI: ' +
      (s.noFact ? 'нет факта' : fmt(s.spi)) +
      ' / пригодные FDM: ' +
      fmt(s.observed) +
      ' · ' +
      fmt(s.spiRate, 2) +
      ' на 1000. Эти записи не являются реестром авиационных происшествий.',
    coverage:
      'Пригодные FDM: ' +
      fmt(s.observed) +
      ' / выполненные участки: ' +
      fmt(s.flown) +
      ' = ' +
      fmt(s.fdm) +
      '%. Без записи: ' +
      fmt(s.missing) +
      '. Перегоны включены. цель из производства: ' +
      fmt(f.fdmTarget) +
      '%; отклонение: ' +
      fmt(s.fdm === null || f.fdmTarget === null ? null : s.fdm - f.fdmTarget) +
      ' п.п. Это не регуляторный норматив.',
    risks:
      'Неприемлемых: ' +
      s.unacceptable +
      ' · без завершённой оценки: ' +
      s.unassessed +
      '. Риски нельзя суммировать с событиями и мерами.',
    service:
      'Без нарушения: ' +
      fmt(s.obligations - s.missed) +
      ' / ' +
      fmt(s.obligations) +
      ' = ' +
      fmt(s.service) +
      '%. Уникальных заданий с нарушением: ' +
      fmt(s.missed) +
      '.',
    forecast:
      'Ресурсные риски: ' +
      fmt(s.futureRisk) +
      ' / ' +
      fmt(s.future) +
      ' будущих коммерческих рейсов. Это флаги ремонта / назначения экипажа, не вероятность срыва и не прогноз аварий.',
    claims:
      'Претензий: ' +
      fmt(s.claims) +
      ' · сумма заявленных требований: ' +
      fmt(s.noFact ? null : rows.reduce((a, r) => a + (r.amount || 0), 0), 2) +
      ' млн ₽. Не прибавляется к штрафам или расходам.',
    findings:
      'Существенных открытых замечаний: ' +
      rows.filter((r) => !r.verified && (r.grade || 0) >= 2).length +
      '. Ниже — весь журнал замечаний, включая закрытые. Источники проверок фильтруются отдельно.',
    overdue:
      'Просроченных критических: ' +
      s.criticalOverdue +
      '. Открытых мер безопасности: ' +
      s.safetyOpen +
      '. Нулевая просрочка не означает отсутствие действующего ограничения.',
  };
  return (
    <div className="sq-workspace">
      {header}
      {catalogue}
      <section className="sq-panel">
        <div className="sq-title">
          <h2>{sqMetrics[k].name}</h2>
          <Help id={k} />
        </div>
        <p>{sqMetrics[k].definition}</p>
        {notes[k] && <p className="sq-callout">{notes[k]}</p>}
        {['index', 'safa', 'dap'].includes(k) && (
          <div className="sq-decision">
            <strong>Оценка не рассчитывается</strong>
            <p>
              Нужны утверждённая методика, корпоративный источник и
              ответственный. «Нет данных» не заменяется нулём или зелёным
              статусом.
            </p>
            <p>
              Ориентиры:{' '}
              <a
                href="https://www.icao.int/safety-management/SMI/SMM/Chapter%204"
                target="_blank"
                rel="noreferrer"
              >
                ICAO · управление результативностью безопасности
              </a>{' '}
              ·{' '}
              <a
                href="https://www.easa.europa.eu/en/domains/air-operations/ramp-inspection-programmes-safa-saca"
                target="_blank"
                rel="noreferrer"
              >
                EASA · рамповые инспекции
              </a>{' '}
              ·{' '}
              <a
                href="https://www.cargoiq.org/blank-2/new-cargo-iq-performance-scorecard-aims-to-drive-quality-industry-wide"
                target="_blank"
                rel="noreferrer"
              >
                Cargo iQ · качество исполнения
              </a>
              .
            </p>
          </div>
        )}
        {['safety-actions', 'quality-actions', 'effectiveness'].includes(k) && (
          <div className="sq-secondary">
            {(k === 'effectiveness'
              ? ['safety', 'quality']
              : [k === 'quality-actions' ? 'quality' : 'safety']
            ).map((d) => {
              const x = sqEffectiveness(f, scope, d as 'safety' | 'quality');
              return (
                <div key={d}>
                  <span>
                    {d === 'safety' ? 'Безопасность' : 'Качество'} ·
                    подтверждённый эффект к сроку <Help id="effectiveness" />
                  </span>
                  <strong>
                    {fmt(x.value)}
                    {x.value === null ? '' : '%'} · {x.verified}/{x.due}
                  </strong>
                  <small>
                    Нет отдельных сроков проверки: {x.unknown}. Не включены в
                    знаменатель.
                  </small>
                </div>
              );
            })}
          </div>
        )}
        {[
          'events',
          'severe',
          'deviations',
          'ground',
          'service',
          'coverage',
          'forecast',
        ].includes(k) && (
          <details className="sq-months">
            <summary>
              Точные значения по месяцам · нажмите месяц для раскрытия
            </summary>
            <div className="sq-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Месяц</th>
                    {k === 'service' ? (
                      <>
                        <th>Без нарушения, %</th>
                        <th>С нарушением</th>
                      </>
                    ) : k === 'coverage' ? (
                      <>
                        <th>FDM, %</th>
                        <th>Пригодных записей</th>
                      </>
                    ) : k === 'forecast' ? (
                      <>
                        <th>Будущих рейсов</th>
                        <th>С ресурсным риском</th>
                      </>
                    ) : (
                      <>
                        <th>Инциденты</th>
                        <th>SPI</th>
                        <th>На земле</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((m) => (
                    <tr key={m.month}>
                      <th>
                        <a href={url({ start: m.month, end: m.month })}>
                          {m.label} →
                        </a>
                      </th>
                      {k === 'service' ? (
                        <>
                          <td>{fmt(m.service)}</td>
                          <td>{fmt(m.missed)}</td>
                        </>
                      ) : k === 'coverage' ? (
                        <>
                          <td>{fmt(m.coverage)}</td>
                          <td>
                            {m.month > f.asOf.slice(0, 7)
                              ? '—'
                              : fmt(m.observed)}
                          </td>
                        </>
                      ) : k === 'forecast' ? (
                        <>
                          <td>
                            {m.month <= f.asOf.slice(0, 7)
                              ? '—'
                              : fmt(m.future)}
                          </td>
                          <td>
                            {m.month <= f.asOf.slice(0, 7) ? '—' : fmt(m.risk)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{fmt(m.incident)}</td>
                          <td>{fmt(m.spi)}</td>
                          <td>{fmt(m.ground)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
        {!methods && (
          <>
            <div className="sq-list-controls">
              <label>
                Поиск в текущем списке
                <input
                  aria-label="Поиск записей безопасности и качества"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  placeholder={
                    flightMode
                      ? 'Рейс, борт, нарушение'
                      : 'Запись, борт, ответственный'
                  }
                />
              </label>
              {['findings', 'inspections'].includes(k) && (
                <label>
                  Источник проверки
                  <select
                    aria-label="Источник проверки"
                    value={route.category || ''}
                    onChange={(e) =>
                      nav({ category: e.target.value || undefined })
                    }
                  >
                    <option value="">Все источники</option>
                    <option value="SAFA">SAFA</option>
                    <option value="REGULATOR">Регулятор</option>
                    <option value="INTERNAL">Внутренний аудит</option>
                  </select>
                </label>
              )}
              {flightMode && (
                <label>
                  Состав списка
                  <select
                    aria-label="Состав списка рейсов"
                    value={route.category || 'ISSUES'}
                    onChange={(e) =>
                      nav({
                        category: e.target.value === 'ALL' ? 'ALL' : undefined,
                      })
                    }
                  >
                    <option value="ISSUES">
                      {k === 'coverage'
                        ? 'Без пригодной FDM'
                        : k === 'forecast'
                          ? 'С ресурсным риском'
                          : 'С нарушением'}
                    </option>
                    <option value="ALL">Все задания этого показателя</option>
                  </select>
                </label>
              )}
              <span>Найдено: {fmt(count, 0)}</span>
            </div>
            {!count ? (
              <p className="sq-empty">
                {s.noFact &&
                !['action', 'risk', 'finding'].some((kind) =>
                  rows.some((r) => r.kind === kind),
                )
                  ? 'Факта за будущий период нет.'
                  : 'Записей по выбранным условиям нет.'}{' '}
                Это не автоматическая оценка безопасности.{' '}
                <a
                  href={url({
                    kpi: k === 'overdue' ? 'safety-actions' : undefined,
                  })}
                >
                  {k === 'overdue'
                    ? 'Посмотреть все меры безопасности'
                    : 'К обзору блока'}
                </a>
              </p>
            ) : (
              <div className="sq-table-wrap">
                <table>
                  <thead>
                    {flightMode ? (
                      <tr>
                        <th>Рейс / дата</th>
                        <th>Тип / борт</th>
                        <th>
                          {k === 'coverage'
                            ? 'FDM'
                            : k === 'forecast'
                              ? 'Ресурсный риск'
                              : 'Исполнение'}
                        </th>
                        <th>Причина / что проверить</th>
                        <th>Ответственный</th>
                      </tr>
                    ) : (
                      <tr>
                        <th>Запись / дата</th>
                        <th>Тип / борт</th>
                        <th>Категория</th>
                        <th>Статус</th>
                        <th>Ответственный / срок</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {flightMode
                      ? flightFiltered
                          .slice(page * 20, page * 20 + 20)
                          .map((l) => (
                            <tr key={l.flightId}>
                              <td>
                                <a
                                  href={cross(
                                    'production',
                                    l.flightId,
                                    k === 'service'
                                      ? 'commitments'
                                      : k === 'forecast'
                                        ? 'crew'
                                        : 'fdm',
                                  )}
                                >
                                  {l.flightId} →
                                </a>
                                <small>{l.date}</small>
                              </td>
                              <td>
                                {fleetName(l.fleet)}
                                <small>{l.aircraftId}</small>
                              </td>
                              <td>
                                {k === 'coverage'
                                  ? l.fdmValid
                                    ? 'Запись пригодна'
                                    : 'Нет пригодной записи'
                                  : k === 'forecast'
                                    ? !l.crewAssigned || l.repairs.length
                                      ? 'Требует проверки'
                                      : 'По двум флагам риска нет'
                                    : l.commitmentMiss
                                      ? 'Нарушение'
                                      : 'Без нарушения по прокси'}
                              </td>
                              <td>
                                {k === 'coverage'
                                  ? 'Проверить полноту объективного контроля'
                                  : k === 'forecast'
                                    ? [
                                        !l.crewAssigned
                                          ? 'Нет назначения экипажа'
                                          : '',
                                        l.repairs.length
                                          ? 'Пересечение ремонта'
                                          : '',
                                      ]
                                        .filter(Boolean)
                                        .join(' · ') ||
                                      'Допуски, отдых и разрешения проверяются отдельно'
                                    : [
                                        l.status === 'CANCELLED'
                                          ? 'Отмена'
                                          : '',
                                        l.deliveryMiss
                                          ? 'Нарушено условное клиентское окно'
                                          : '',
                                        l.offloadKg > 0
                                          ? 'Недогруз при наличии груза'
                                          : '',
                                      ]
                                        .filter(Boolean)
                                        .join(' · ') ||
                                      'Исходная запись производства'}
                              </td>
                              <td>
                                {k === 'coverage'
                                  ? 'Объективный контроль'
                                  : k === 'forecast'
                                    ? 'ПД / лётная служба / технический директор'
                                    : 'Коммерческий + производственный директор'}
                              </td>
                            </tr>
                          ))
                      : filtered.slice(page * 20, page * 20 + 20).map((r) => (
                          <tr key={r.id}>
                            <td>
                              <a href={url({ id: r.id, kpi: k })}>
                                {r.title} →
                              </a>
                              <small>
                                {r.id} · {r.date}
                              </small>
                            </td>
                            <td>
                              {fleetName(r.fleet)}
                              <small>
                                {r.aircraftId || 'Без распределения'}
                              </small>
                            </td>
                            <td>
                              {categoryName[r.category] || r.category}
                              {r.grade ? ' · ' + r.grade : ''}
                              {r.repeated ? ' · повторное' : ''}
                            </td>
                            <td>
                              {r.status}
                              {r.critical && (
                                <small>Критическая мера / риск</small>
                              )}
                              {r.kind === 'action' && (
                                <small
                                  className={
                                    !r.verified &&
                                    r.verificationDue &&
                                    r.verificationDue < f.asOf
                                      ? 'sq-late'
                                      : ''
                                  }
                                >
                                  Эффект:{' '}
                                  {r.verified
                                    ? 'подтверждён'
                                    : 'не подтверждён'}
                                  {!r.verified &&
                                  r.verificationDue &&
                                  r.verificationDue < f.asOf
                                    ? ' · срок проверки истёк'
                                    : ''}
                                </small>
                              )}
                            </td>
                            <td>
                              {r.owner}
                              <small
                                className={
                                  r.due &&
                                  r.due < f.asOf &&
                                  !r.implemented &&
                                  !r.verified
                                    ? 'sq-late'
                                    : ''
                                }
                              >
                                {r.due ? 'Срок: ' + r.due : 'Срок не назначен'}
                                {r.due &&
                                r.due < f.asOf &&
                                !r.implemented &&
                                !r.verified
                                  ? ' · просрочено'
                                  : ''}
                              </small>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="sq-pagination">
              <button disabled={page === 0} onClick={() => setPage(page - 1)}>
                ← Назад
              </button>
              <span>
                Страница {page + 1} из {pages}
              </span>
              <button
                disabled={page + 1 >= pages}
                onClick={() => setPage(page + 1)}
              >
                Далее →
              </button>
            </div>
          </>
        )}
        <div className="sq-reference">
          <strong>С чем сравнивать</strong>
          <p>
            Корпоративные планы, цели SPI и допустимые пороги не загружены. Для
            полноты FDM сохранена цель {fmt(f.fdmTarget)}% из
            производства; она не является нормативом. Для мер используется их
            исходный срок, для рейсов — обещание из производства.
            Текущие цифры не выдаются за норматив соответствия законодательству.
          </p>
        </div>
        {primary.includes(k) && (
          <a
            href={url({
              kpi:
                k === 'severe'
                  ? 'deviations'
                  : k === 'overdue'
                    ? 'safety-actions'
                    : k === 'service'
                      ? 'forecast'
                      : 'inspections',
            })}
          >
            Связанный контроль →
          </a>
        )}
      </section>
      {foot}
    </div>
  );
}
