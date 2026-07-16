// Worker de login Steam (OpenID) para o site Vizinhos Rust Brasil.
//
// COMO PUBLICAR (uma vez, ~5 min, plano gratuito do Cloudflare):
//   1. dash.cloudflare.com -> Workers & Pages -> Create Worker -> nome: steam-auth
//   2. Colar este arquivo inteiro no editor e Deploy
//   3. Na aba Settings do worker -> Domains & Routes -> Add -> Custom Domain:
//        auth.vizinhos-rust.com.br
//      (o Cloudflare cria o DNS sozinho)
//   4. (Opcional, para mostrar nick e avatar da Steam no site)
//      Settings -> Variables and Secrets -> Add:
//        STEAM_API_KEY = chave gratuita de https://steamcommunity.com/dev/apikey
//
// Fluxo: site -> /login -> Steam -> /callback (verifica assinatura com a Steam)
//        -> redireciona de volta ao site com #steam=<steamid64>&name=...&avatar=...

const SITE_URL = 'https://vizinhos-rust.com.br';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const self = url.origin;

    if (url.pathname === '/login') {
      const p = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': self + '/callback',
        'openid.realm': self,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
      });
      return Response.redirect('https://steamcommunity.com/openid/login?' + p.toString(), 302);
    }

    if (url.pathname === '/callback') {
      // Reenvia os parametros para a Steam confirmar que a resposta e legitima
      const params = new URLSearchParams(url.search);
      params.set('openid.mode', 'check_authentication');
      const verify = await fetch('https://steamcommunity.com/openid/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const body = await verify.text();

      const claimed = url.searchParams.get('openid.claimed_id') || '';
      const match = claimed.match(/\/openid\/id\/(\d{17})$/);

      if (!body.includes('is_valid:true') || !match) {
        return Response.redirect(SITE_URL + '/#steam-error', 302);
      }
      const steamId = match[1];

      // Nick e avatar (opcional, precisa do secret STEAM_API_KEY)
      let name = '';
      let avatar = '';
      if (env.STEAM_API_KEY) {
        try {
          const r = await fetch(
            'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=' +
              env.STEAM_API_KEY + '&steamids=' + steamId
          );
          const j = await r.json();
          const pl = j && j.response && j.response.players && j.response.players[0];
          if (pl) {
            name = pl.personaname || '';
            avatar = pl.avatarfull || '';
          }
        } catch (e) {
          // sem nick/avatar; o login continua funcionando
        }
      }

      const frag = new URLSearchParams({ steam: steamId });
      if (name) frag.set('name', name);
      if (avatar) frag.set('avatar', avatar);
      return Response.redirect(SITE_URL + '/#' + frag.toString(), 302);
    }

    return Response.redirect(SITE_URL, 302);
  },
};
