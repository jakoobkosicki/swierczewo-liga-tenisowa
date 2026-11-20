# Liga Tenisowa Kobiet

Aplikacja Vite + Supabase: prywatne logowanie, tabela ligowa, terminarz i edycja wyników przez administratora.

## Publikacja na GitHub i Vercel

1. Prześlij do repozytorium **zawartość** tego katalogu (nie plik ZIP jako jeden plik). Zachowaj folder `src`.
2. W Vercel wybierz Add New → Project → Import repozytorium `liga-tenisowa`.
3. Framework Preset: **Vite**; Build Command: `npm run build`; Output Directory: `dist`.
4. W Environment Variables dodaj:
   - `VITE_SUPABASE_URL` = `https://tzkfxfbylchhizxufmau.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = klucz `sb_publishable_...` z Supabase.
5. Kliknij Deploy. **Nie używaj `sb_secret_...` ani `service_role` w Vercel pod prefiksem `VITE_`.**
6. W Supabase → Authentication → URL Configuration ustaw Site URL na dokładny adres z Vercel (https://...). Dodaj ten adres do Redirect URLs (np. `https://twoja-liga.vercel.app/**`).
7. Zaproszenia wysłane wcześniej na localhost mogą wymagać ponownego wysłania. Zaproszenie/odzyskanie hasła powinno prowadzić na działającą stronę; sprawdź je po wdrożeniu.

## Założenia bazy

- `public.players`: `id` (integer), `name` (text).
- `public.matches`: `id` (text), `round` (integer), `player_a`, `player_b` (ID zawodniczek), `s1`, `s2`, `st` (text, format `6-4` lub `10-8`).
- RPC `is_league_admin()` zwraca boolean dla zalogowanego użytkownika.
- RLS musi zezwalać `authenticated` na SELECT `players` i `matches`, a UPDATE `matches` tylko administratorowi. Sama aplikacja nie zastępuje RLS.
- Tabele `players`, `matches` muszą być udostępnione w Data API.

## Punktacja

2:0 = 3:0 punktów; 2:1 po super tie-breaku = 2:1 punktów. Remis w setach bez super tie-breaka nie jest zaliczany do tabeli.

## Uwagi

Projekt nie zmienia struktury ani istniejących rekordów bazy. Sprawdź polityki RLS dla `players`, `matches` oraz implementację funkcji `is_league_admin()` przed udostępnieniem użytkownikom. W tym wariancie zaproszenia obsługiwane są przez Supabase Auth; jeśli link zaproszenia wymaga ustawienia hasła, można użyć opcji „Nie pamiętasz hasła?” po ustawieniu prawidłowego Site URL.
