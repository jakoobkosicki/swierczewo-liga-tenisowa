import { createClient } from '@supabase/supabase-js';
import './style.css';
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const app=document.querySelector('#app');
if(!url||!key){app.innerHTML='<main class="shell"><h1>🎾 Liga Tenisowa Kobiet</h1><p>Brakuje ustawień Supabase w Vercel: VITE_SUPABASE_URL i VITE_SUPABASE_PUBLISHABLE_KEY.</p></main>';throw new Error('Missing Supabase environment variables');}
const db=createClient(url,key,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
let session=null,players=[],matches=[],admin=false,tab='table',round=1,notice='',authMode='login',loading=false,showAdminLogin=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId=id=>players.find(p=>Number(p.id)===Number(id))?.name??`Zawodniczka ${id}`;
const scoreText=m=>[m.s1,m.s2,m.st].filter(v=>v!==null&&v!==undefined&&String(v).trim()!=='').join(' · ')||'Do rozegrania';
const parseSet=s=>{const m=String(s??'').trim().match(/^(\d+)\s*[-:]\s*(\d+)$/);return m?[+m[1],+m[2]]:null;};
function result(m){const a=parseSet(m.s1),b=parseSet(m.s2),t=parseSet(m.st);if(!a||!b||a[0]===a[1]||b[0]===b[1])return null;let wa=+(a[0]>a[1])+(b[0]>b[1]);let wb=2-wa;if(wa===2||wb===2){if(t)return null;return {winner:wa===2?m.player_a:m.player_b,points:wa===2?[3,0]:[0,3],sets:wa===2?[2,0]:[0,2]};}if(!t||t[0]===t[1])return null;const home=t[0]>t[1];return {winner:home?m.player_a:m.player_b,points:home?[2,1]:[1,2],sets:home?[2,1]:[1,2]};}
function standings(){const rows=new Map(players.map(p=>[Number(p.id),{id:p.id,name:p.name,played:0,wins:0,losses:0,points:0,setsWon:0,setsLost:0}]));for(const m of matches){const r=result(m);if(!r)continue;const a=rows.get(Number(m.player_a)),b=rows.get(Number(m.player_b));if(!a||!b)continue;a.played++;b.played++;a.points+=r.points[0];b.points+=r.points[1];a.setsWon+=r.sets[0];a.setsLost+=r.sets[1];b.setsWon+=r.sets[1];b.setsLost+=r.sets[0];if(Number(r.winner)===Number(m.player_a)){a.wins++;b.losses++;}else{b.wins++;a.losses++;}}return [...rows.values()].sort((a,b)=>b.points-a.points||(b.setsWon-b.setsLost)-(a.setsWon-a.setsLost)||b.wins-a.wins||a.name.localeCompare(b.name,'pl'));}
function header(){return `<header class="top"><div class="shell bar"><div class="brand">🎾 <span>Liga Tenisowa <small>Kobiet</small></span></div><div class="right"><span class="email">${esc(session?.user?.email||'')}</span>${session ? '<button class="outline" id="logout">Wyloguj</button>' : '<button class="outline" id="admin-login">Panel administratora</button>'}</div></div></header>`;}
function roundDates(number) {
  const start = new Date(Date.UTC(2026, 9, 5));
  start.setUTCDate(start.getUTCDate() + (number - 1) * 21);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 34);

  const format = date => date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  });

  return `${format(start)} – ${format(end)}`;
}function render(){if(!session&&showAdminLogin){app.innerHTML=`<main class="auth-wrap"><div class="auth-card"><div class="logo">🎾</div><h1>Liga Tenisowa Kobiet</h1><p>Prywatna liga — zaloguj się, aby zobaczyć mecze i tabelę.</p><form id="auth-form"><label>Adres e-mail<input type="email" name="email" required autocomplete="email" placeholder="twoj@email.pl"></label>${authMode==='login'?'<label>Hasło<input type="password" name="password" required autocomplete="current-password"></label>':''}<button type="submit">${authMode==='login'?'Zaloguj się':'Wyślij link do ustawienia hasła'}</button></form><button class="text-button" id="mode">${authMode==='login'?'Nie pamiętasz hasła?':'Wróć do logowania'}</button><p class="message">${esc(notice)}</p></div></main>`;document.querySelector('#auth-form').onsubmit=authenticate;document.querySelector('#mode').onclick=()=>{authMode=authMode==='login'?'reset':'login';notice='';render();};return;}

const standingsHtml=standings().map((p,i)=>{
  const parts=p.name.trim().split(/\s+/);
  const shortName=parts.length>1
    ? `${parts[0]} ${parts[1][0]}.`
    : p.name;

  return `<tr>
    <td class="rank">${i+1}</td>
    <td>
      <button type="button" class="player-link" data-player="${esc(p.id)}" aria-label="Profil: ${esc(p.name)}">
        <span class="name-full">${esc(p.name)}</span>
        <span class="name-short">${esc(shortName)}</span>
      </button>
    </td>
    <td>${p.played}</td>
    <td>${p.wins}</td>
    <td>${p.losses}</td>
    <td><strong>${p.points}</strong></td>
    <td>${p.setsWon}:${p.setsLost}</td>
  </tr>`;
}).join('');
const rounds=[...new Set(matches.map(m=>Number(m.round)))].sort((a,b)=>a-b);
const matchesHtml=matches.filter(m=>Number(m.round)===round).sort((a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true})).map(m=>{const r=result(m);return `<article class="match"><div class="match-head"><span>Spotkanie ${esc(m.id)}</span><span class="${r?'finished':'pending'}">${r?'Zakończony':'Do rozegrania'}</span></div><div class="pair"><span class="${r&&Number(r.winner)===Number(m.player_a)?'winner':''}">${esc(byId(m.player_a))} <small>gospodyni</small></span><span class="vs">VS</span><span class="${r&&Number(r.winner)===Number(m.player_b)?'winner':''}">${esc(byId(m.player_b))}</span></div><div class="score">${esc(scoreText(m))}</div>${admin?`<button class="edit" data-edit="${esc(m.id)}">Wpisz / popraw wynik</button>`:''}</article>`;}).join('')||'<p>Brak meczów w tej kolejce.</p>';
app.innerHTML=`${header()}<main class="shell"><section class="hero"><span class="eyebrow">SEZON LIGOWY</span><h1>Razem na korcie 💗</h1><p>Terminarz, wyniki i klasyfikacja naszej ligi tenisowej.</p><div class="stats"><span><strong>${players.length}</strong> zawodniczek</span><span><strong>${matches.length}</strong> meczów</span><span><strong>${matches.filter(result).length}</strong> zakończonych</span></div></section><div class="tabs"><button class="${tab==='table'?'active':''}" data-tab="table">🏆 Tabela ligowa</button><button class="${tab==='matches'?'active':''}" data-tab="matches">📅 Terminarz i wyniki</button></div>${notice?`<p class="message">${esc(notice)}</p>`:''}${tab==='table'?`<section class="panel"><h2>Klasyfikacja</h2>
<div class="points-info">
  <strong>Zasady punktacji</strong>
  <div class="points-grid">
    <div>Wygrana 2:0<br><strong>3 pkt</strong></div>
    <div>Wygrana 2:1<br><strong>2 pkt</strong></div>
    <div>Przegrana 1:2<br><strong>1 pkt</strong></div>
  </div>
</div>
<div class="scroll"><table><thead><tr><th>#</th><th>Zawodniczka</th><th>M</th><th>W</th><th>P</th><th>PKT</th><th>Sety</th></tr></thead><tbody>${standingsHtml}</tbody></table></div></section>`:`<section class="panel"><div class="section-title"><h2>Terminarz</h2><label>Kolejka <select id="round">${rounds.map(n=>`<option value="${n}" ${round===n?'selected':''}>${n}</option>`).join('')}</select></label></div><p class="round-dates">
  📅 Termin kolejki: <strong>${roundDates(round)}</strong>
</p>
<div class="matches">${matchesHtml}</div></section>`}<footer>🎾 Liga Tenisowa Kobiet · Dostęp tylko dla zaproszonych osób</footer></main><div id="modal"></div>`;
document.querySelector('#admin-login')?.addEventListener('click',()=>{showAdminLogin=true;render();});

document.querySelector('#logout')?.addEventListener('click', async () => {
  await db.auth.signOut();
  session = null;
  admin = false;
  notice = '';
  render();
});

document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
  tab = b.dataset.tab;
  notice = '';
  render();
});

document.querySelector('#round')?.addEventListener('change', e => {
  round = Number(e.target.value);
  render();
});

document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editMatch(b.dataset.edit));
document.querySelectorAll('[data-player]').forEach(b => b.onclick = () => showPlayerProfile(b.dataset.player));
}
async function authenticate(e){e.preventDefault();const fd=new FormData(e.target),email=String(fd.get('email')).trim(),password=String(fd.get('password')||'');const res=authMode==='login'?await db.auth.signInWithPassword({email,password}):await db.auth.resetPasswordForEmail(email,{redirectTo:location.origin});notice=res.error?res.error.message:(authMode==='reset'?'Sprawdź pocztę i otwórz link do ustawienia hasła.':'Zalogowano.');if(!res.error&&authMode==='login')await load();else render();}
async function load(){const s=await db.auth.getSession();session=s.data.session;loading=true;const [p,m,a]=await Promise.all([db.from('players').select('id,name').order('id'),db.from('matches').select('id,round,player_a,player_b,s1,s2,st'),db.rpc('is_league_admin')]);players=p.data||[];matches=m.data||[];admin=!a.error&&a.data===true;notice=p.error||m.error?`Nie udało się pobrać danych: ${p.error?.message||m.error?.message}`:'';loading=false;render();}
function showPlayerProfile(id) {
  const player = standings().find(p => Number(p.id) === Number(id));
  if (!player) return;

  const games = matches
    .filter(m => Number(m.player_a) === Number(id) || Number(m.player_b) === Number(id))
    .sort((a, b) => Number(a.round) - Number(b.round));
  const played = games.filter(m => result(m));
  const upcoming = games.filter(m => !result(m));

  const gameHtml = m => {
    const isHome = Number(m.player_a) === Number(id);
    const opponent = byId(isHome ? m.player_b : m.player_a);
    const outcome = result(m);
    const status = outcome
      ? (Number(outcome.winner) === Number(id) ? 'Wygrana' : 'Przegrana')
      : 'Do rozegrania';
    return `<div class="profile-match">
      <div><strong>Kolejka ${esc(m.round)}</strong> · ${esc(opponent)}</div>
      <div class="profile-match-meta">${isHome ? 'Gospodyni' : 'Gościni'} · ${esc(roundDates(Number(m.round)))} · ${status}</div>
      <div class="profile-match-score">${esc(scoreText(m))}</div>
    </div>`;
  };

  const modal = document.querySelector('#modal');
  modal.innerHTML = `<div class="overlay" id="profile-overlay">
    <section class="dialog profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-title">
      <div class="profile-heading"><h2 id="profile-title">${esc(player.name)}</h2><button type="button" class="outline" id="close-profile">Zamknij</button></div>
      <div class="profile-stats">
        <div><strong>${player.played}</strong><span>Mecze</span></div>
        <div><strong>${player.wins}</strong><span>Wygrane</span></div>
        <div><strong>${player.losses}</strong><span>Przegrane</span></div>
        <div><strong>${player.points}</strong><span>Punkty</span></div>
      </div>
<h3>Rozegrane (${played.length})</h3>
${played.length ? played.map(gameHtml).join('') : '<p class="hint">Brak rozegranych meczów.</p>'}
<h3>Do rozegrania (${upcoming.length})</h3>
${upcoming.length ? upcoming.map(gameHtml).join('') : '<p class="hint">Brak oczekujących meczów.</p>'}
    </section>
  </div>`;
  document.querySelector('#close-profile').onclick = () => { modal.innerHTML = ''; };
  document.querySelector('#profile-overlay').onclick = e => {
    if (e.target.id === 'profile-overlay') modal.innerHTML = '';
  };
}

function editMatch(id) {
  const m = matches.find(x => String(x.id) === String(id));
  if (!m) return;

  const modal = document.querySelector('#modal');
  modal.innerHTML = `<div class="overlay"><form class="dialog" id="result-form">
    <h2>Wynik meczu</h2>
    <p>${esc(byId(m.player_a))} — ${esc(byId(m.player_b))}</p>
    <p class="hint">Zapisuj wynik z perspektywy gospodyni, np. 6:4. Przy remisie 1:1 podaj super tie-break, np. 10:8. Możesz również użyć myślnika.</p>
    ${[['s1', 'Set 1'], ['s2', 'Set 2'], ['st', 'Super tie-break (przy 1:1)']].map(([field, label]) =>
      `<label>${label}<input name="${field}" value="${esc(m[field] || '')}" placeholder="${field === 'st' ? '10:8' : '6:4'}" /></label>`
    ).join('')}
    <p id="form-error" class="error"></p>
    <div class="actions"><button type="button" class="outline" id="cancel">Anuluj</button><button type="submit">Zapisz wynik</button></div>
  </form></div>`;

  const form = document.querySelector('#result-form');
  const s1 = form.elements.namedItem('s1');
  const s2 = form.elements.namedItem('s2');
  const st = form.elements.namedItem('st');
  const errorBox = document.querySelector('#form-error');

  const updateSuperTieBreak = () => {
    const a = parseSet(s1.value);
    const b = parseSet(s2.value);
    const needed = Boolean(a && b && a[0] !== a[1] && b[0] !== b[1] &&
      (a[0] > a[1]) !== (b[0] > b[1]));
    st.disabled = !needed;
    st.required = needed;
    if (!needed) st.value = '';
  };

  s1.addEventListener('input', updateSuperTieBreak);
  s2.addEventListener('input', updateSuperTieBreak);
  updateSuperTieBreak();

  document.querySelector('#cancel').onclick = () => { modal.innerHTML = ''; };
  form.onsubmit = async e => {
    e.preventDefault();
    errorBox.textContent = '';
    const data = Object.fromEntries(['s1', 's2', 'st'].map(k => {
      const raw = String(form.elements.namedItem(k).value || '').trim();
      const parsed = raw ? parseSet(raw) : null;
      return [k, parsed ? `${parsed[0]}:${parsed[1]}` : (raw || null)];
    }));

    if (Object.values(data).some(v => v && !parseSet(v))) {
      errorBox.textContent = 'Wpisz wyniki w formacie 6:4 lub 6-4.';
      return;
    }
    if (Object.values(data).some(Boolean) && !result({ ...m, ...data })) {
      errorBox.textContent = 'Podaj dwa rozstrzygnięte sety oraz super tie-break tylko przy wyniku 1:1. Aby usunąć wynik, wyczyść wszystkie pola.';
      return;
    }

    const { error } = await db.from('matches').update(data).eq('id', m.id);
    if (error) {
      errorBox.textContent = error.message;
      return;
    }
    modal.innerHTML = '';
    notice = 'Wynik został zapisany.';
    await load();
  };
}
async function setup(){const {data:{session:s}}=await db.auth.getSession();session=s;db.auth.onAuthStateChange((event,newSession)=>{if(event==='PASSWORD_RECOVERY'){session=newSession;setTimeout(()=>showPasswordForm(),0);}else if(event==='SIGNED_IN'&&newSession&&!session){session=newSession;setTimeout(()=>load(),0);}else if(event==='SIGNED_OUT'){session=null;setTimeout(()=>render(),0);}});await load();}
function showPasswordForm(){app.innerHTML=`<main class="auth-wrap"><form class="auth-card" id="password-form"><h1>Ustaw hasło</h1><p>Ustaw hasło do konta Ligi Tenisowej.</p><label>Nowe hasło<input name="password" type="password" minlength="8" required autocomplete="new-password"></label><button type="submit">Zapisz hasło</button><p class="message" id="password-message"></p></form></main>`;document.querySelector('#password-form').onsubmit=async e=>{e.preventDefault();const password=new FormData(e.target).get('password');const {error}=await db.auth.updateUser({password});if(error){document.querySelector('#password-message').textContent=error.message;return;}history.replaceState({},'',location.pathname);notice='Hasło ustawione.';await load();};}
setup();
