'use client';
import { ChevronRight } from 'lucide-react';
import { ownerHref, resultTrail, type OwnerRoute, type OwnerWorkspace } from '@/lib/owner-model';

export default function ResultContext({data,route}: {data:OwnerWorkspace;route:OwnerRoute}) {
  const steps=resultTrail(data,route);
  if (!steps.length) return null;
  return <nav className="result-context" aria-label="Выбранный показатель и его раскрытие"><ol>{steps.map((step,index)=><li key={index}>
    <a href={ownerHref(step.route)} aria-current={index===steps.length-1&&route.page!=='company'?'page':undefined}>
      <span className="context-level">{String(index+1).padStart(2,'0')}<ChevronRight/></span>
      <span className="context-copy"><span>{step.label}</span><small>{step.caption}</small></span>
      <strong>{typeof step.value==='number'&&Number.isFinite(step.value)?new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(step.value).replace('-','−'):'—'}<small>млн ₽</small></strong>
    </a>
  </li>)}</ol></nav>;
}
