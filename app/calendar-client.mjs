import { doctors, REFERENCE_DATE, REFERENCE_MONTH, monthGrid, shiftMonth, entriesForDay, monthSummary, calendarLabels, entryLabel } from './calendar.mjs';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const locale = language => ({en:'en',pt:'pt-BR',es:'es'}[language] || 'en');
const extra = {
  en:{eyebrow:'Fictional care team',month:'this month',back:'Back to calendar',legend:'Agenda status',example:'Example',source:'The linked case records remain the source of truth.'},
  pt:{eyebrow:'Equipe médica fictícia',month:'neste mês',back:'Voltar ao calendário',legend:'Estado na agenda',example:'Exemplo',source:'Os registros do caso vinculado continuam sendo a fonte de referência.'},
  es:{eyebrow:'Equipo médico ficticio',month:'este mes',back:'Volver al calendario',legend:'Estado de la agenda',example:'Ejemplo',source:'Los registros del caso vinculado siguen siendo la fuente de referencia.'},
};
const tone = status => ['blocked','cancelled'].includes(status) ? 'stop' : ['medical','conflict','pending','waiting'].includes(status) ? 'warn' : '';
const mark = status => ['blocked','cancelled'].includes(status) ? 'blocked' : ['medical','conflict','pending','waiting'].includes(status) ? 'attention' : '';
const dateValue = date => new Date(`${date}T12:00:00Z`);
const formatDate = (date, language, options) => new Intl.DateTimeFormat(locale(language),{...options,timeZone:'UTC'}).format(dateValue(date));

export function mountCalendar(container, { language, openCase, canNavigate = () => true }) {
  let displayed = {...REFERENCE_MONTH}, selected = REFERENCE_DATE, doctorId = 'all';
  function render(focus = null) {
    const lang=language(),c=calendarLabels(lang),x=extra[lang] || extra.en;
    container.setAttribute('aria-label',c.calendarLabel);
    const grid=monthGrid(displayed.year,displayed.month),counts=monthSummary(displayed.year,displayed.month,doctorId);
    const dayItems=entriesForDay(selected,doctorId);
    const monthLabel=formatDate(`${String(displayed.year).padStart(4,'0')}-${String(displayed.month+1).padStart(2,'0')}-01`,lang,{month:'long',year:'numeric'});
    const cell = day => {
      const items=entriesForDay(day.date,doctorId);
      const name=formatDate(day.date,lang,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
      return `<td><button type="button" class="calendar-day ${day.inMonth ? '' : 'outside'} ${day.date===REFERENCE_DATE ? 'reference' : ''}" data-date="${esc(day.date)}" aria-pressed="${day.date===selected}" aria-label="${esc(name)} · ${items.length} ${esc(c.dayItems.toLowerCase())}" tabindex="${day.date===selected ? 0 : -1}"><span aria-hidden="true">${day.day}</span>${items.length ? `<span class="calendar-marks" aria-hidden="true">${items.map(item=>`<i class="${mark(item.status)}"></i>`).join('')}</span><span class="day-count" aria-hidden="true">${items.length}</span>` : ''}</button></td>`;
    };
    container.innerHTML=`<header class="calendar-head"><div><p class="eyebrow">${esc(x.eyebrow)}</p><h2>${esc(c.title)}</h2><p>${esc(c.subtitle)}</p></div><span class="tag">${esc(c.readOnly)}</span></header>
      <div class="calendar-layout"><div class="calendar-board" id="calendar-board"><div class="calendar-toolbar"><h3 class="calendar-month" id="calendar-month">${esc(monthLabel)}</h3><div class="month-controls"><button type="button" id="calendar-previous" aria-label="${esc(c.previous)}" ${displayed.year===1 && displayed.month===0 ? 'disabled' : ''}><span aria-hidden="true">←</span></button><button type="button" id="calendar-reference" title="${esc(c.referenceDate)}">${esc(x.example)}<span class="reference-label"> · ${esc(formatDate(REFERENCE_DATE,lang,{month:'short'}))}</span></button><button type="button" id="calendar-next" aria-label="${esc(c.next)}" ${displayed.year===9999 && displayed.month===11 ? 'disabled' : ''}><span aria-hidden="true">→</span></button></div></div>
      <div class="calendar-filters"><div class="field"><label for="calendar-doctor">${esc(c.doctorLabel)}</label><select id="calendar-doctor"><option value="all">${esc(c.allDoctors)}</option>${doctors.map(doctor=>`<option value="${doctor.id}" ${doctor.id===doctorId ? 'selected' : ''}>${doctor.name}</option>`).join('')}</select></div><p class="caption">${counts.total} ${esc(c.dayItems.toLowerCase())} · ${esc(x.month)}</p></div>
      <table class="calendar-table" aria-label="${esc(c.calendarLabel)}" aria-describedby="calendar-month"><thead><tr>${c.weekdays.map((day,index)=>`<th scope="col"><abbr title="${esc(c.weekdayNames[index])}">${esc(day)}</abbr></th>`).join('')}</tr></thead><tbody>${Array.from({length:6},(_,row)=>`<tr>${grid.slice(row*7,row*7+7).map(cell).join('')}</tr>`).join('')}</tbody></table>
      <div class="calendar-legend" aria-label="${esc(x.legend)}"><span><i></i>${esc(c.statuses.available)}</span><span><i class="attention"></i>${esc(c.kinds.review)}</span><span><i class="blocked"></i>${esc(c.statuses.blocked)} / ${esc(c.statuses.cancelled)}</span></div></div>
      <section class="day-agenda" id="day-agenda" aria-label="${esc(c.dateLabel)}"><button type="button" class="queue-return" id="calendar-back">← ${esc(x.back)}</button><p class="eyebrow">${esc(c.dateLabel)}</p><h3>${esc(formatDate(selected,lang,{weekday:'long',day:'numeric',month:'long'}))}</h3><p class="caption" role="status">${dayItems.length} ${esc(c.dayItems.toLowerCase())} · Brasília (UTC−3)</p>
      ${dayItems.length ? dayItems.map(item=>{
        const text=entryLabel(item,lang);
        return `<article class="agenda-entry"><div class="agenda-time"><time datetime="${item.start}">${item.start}</time><small>${item.end}</small></div><div><span class="tag ${tone(item.status)}">${esc(c.statuses[item.status])}</span><h4>${esc(text.title)}</h4><p class="entry-meta">${esc(item.doctorId)} · ${esc(c.kinds[item.kind])}</p><p>${esc(text.description)}</p>${item.caseId ? `<button type="button" data-calendar-case="${item.caseId}">${esc(c.openCase)} <span aria-hidden="true">↗</span></button>` : ''}</div></article>`;
      }).join('') : `<div class="empty-state"><p>${esc(c.emptyDay)}</p></div>`}</section></div>
      <p class="calendar-note"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-10v1"/></svg><span>${esc(c.disclaimer)} ${esc(x.source)}</span></p>`;
    for (const [id,delta] of [['calendar-previous',-1],['calendar-next',1]]) container.querySelector('#'+id).onclick=()=>{
      if (!canNavigate()) return;
      displayed={...shiftMonth(displayed.year,displayed.month,delta)};
      selected=`${String(displayed.year).padStart(4,'0')}-${String(displayed.month+1).padStart(2,'0')}-01`;
      render(id);
    };
    container.querySelector('#calendar-reference').onclick=()=>{if(!canNavigate())return;displayed={...REFERENCE_MONTH};selected=REFERENCE_DATE;render('calendar-reference');};
    container.querySelector('#calendar-doctor').onchange=event=>{if(!canNavigate())return;doctorId=event.target.value;render('calendar-doctor');};
    container.querySelector('#calendar-back').onclick=()=>{container.querySelector(`[data-date="${selected}"]`)?.focus({preventScroll:true});container.querySelector('#calendar-board').scrollIntoView({block:'start',behavior:'instant'});};
    container.querySelectorAll('[data-calendar-case]').forEach(button=>button.onclick=()=>{if(canNavigate())openCase(button.dataset.calendarCase);});
    container.querySelectorAll('[data-date]').forEach(button=>{
      button.onclick=()=>{
        if (!canNavigate())return;
        selectDate(button.dataset.date);render(selected);
        if(window.matchMedia('(max-width:760px)').matches)container.querySelector('#day-agenda').scrollIntoView({block:'start',behavior:'instant'});
      };
      button.onkeydown=event=>{
        const offsets={ArrowRight:1,ArrowLeft:-1,ArrowDown:7,ArrowUp:-7};
        let next;
        if(Object.hasOwn(offsets,event.key)){const d=dateValue(button.dataset.date);d.setUTCDate(d.getUTCDate()+offsets[event.key]);next=d.toISOString().slice(0,10);}
        else if(event.key==='Home'||event.key==='End'){const index=grid.findIndex(day=>day.date===button.dataset.date),start=Math.floor(index/7)*7;next=grid[start+(event.key==='End'?6:0)].date;}
        else return;
        event.preventDefault();if(!canNavigate())return;
        selectDate(next);render(selected);
      };
    });
    if (focus) (container.querySelector(`[data-date="${focus}"]`) || container.querySelector('#'+CSS.escape(focus)))?.focus({preventScroll:true});
  }
  function selectDate(date) {
    const [year,month]=date.split('-').map(Number);
    if(year<1||year>9999)return;
    selected=date;displayed={year,month:month-1};
  }
  render();
  return render;
}
