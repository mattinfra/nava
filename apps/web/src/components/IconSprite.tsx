// Sprite SVG unica, iniettata una volta nel DOM — stessi simboli usati in
// docs/mock/index.html, così <Icon name="..."/> può referenziarli via <use>
// senza duplicare i path in ogni componente. Markup statico e fidato: nessun
// input utente qui, dangerouslySetInnerHTML è sicuro.
const ICONS_MARKUP = `
<defs>
  <symbol id="icon-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.2" y2="16.2"/></symbol>
  <symbol id="icon-close" viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></symbol>
  <symbol id="icon-chevron-right" viewBox="0 0 24 24"><polyline points="9 5 16 12 9 19"/></symbol>
  <symbol id="icon-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.6"/><line x1="12" y1="2" x2="12" y2="5"/></symbol>
  <symbol id="icon-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle style="fill:currentColor;stroke:none" cx="12" cy="7.6" r="0.9"/></symbol>
  <symbol id="icon-alert" viewBox="0 0 24 24"><path d="M12 3 L22 20 H2 Z"/><line x1="12" y1="9" x2="12" y2="14.5"/><circle style="fill:currentColor;stroke:none" cx="12" cy="17.3" r="0.9"/></symbol>
  <symbol id="icon-tab-home" viewBox="0 0 24 24"><path d="M4 11.5 L12 4 L20 11.5"/><path d="M6 10 V20 H18 V10"/><line x1="10" y1="20" x2="10" y2="14.5"/><line x1="14" y1="20" x2="14" y2="14.5"/><line x1="10" y1="14.5" x2="14" y2="14.5"/></symbol>
  <symbol id="icon-tab-live" viewBox="0 0 24 24"><path d="M12 2 C6.5 5.5 4 9 4 13 a8 8 0 0 0 16 0 c0-4-2.5-7.5-8-11Z"/><path d="M12 9 c-1.6 1.7-2.6 3.2-2.6 4.6 a2.6 2.6 0 0 0 5.2 0 c0-1.4-1-2.9-2.6-4.6Z" style="fill:currentColor;stroke:none"/></symbol>
  <symbol id="icon-tab-map" viewBox="0 0 24 24"><path d="M9 4 L4 6 V20 L9 18 L15 20 L20 18 V4 L15 6 L9 4Z"/><line x1="9" y1="4" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="20"/></symbol>
  <symbol id="icon-tab-game" viewBox="0 0 24 24"><rect x="2.5" y="8" width="19" height="10" rx="5"/><line x1="4.6" y1="13" x2="9.4" y2="13"/><line x1="7" y1="10.6" x2="7" y2="15.4"/><circle style="fill:currentColor;stroke:none" cx="15.5" cy="11.5" r="1.15"/><circle style="fill:currentColor;stroke:none" cx="18.2" cy="14.2" r="1.15"/></symbol>
  <symbol id="icon-crowd" viewBox="0 0 24 24"><circle cx="8.5" cy="8" r="2.6"/><circle cx="16" cy="9" r="2.1"/><path d="M3.5 19 c0-3.3 2.2-5.4 5-5.4 s5 2.1 5 5.4"/><path d="M14.2 19 c0-2.6 1.6-4.5 3.8-4.5 s3.5 1.6 3.5 4"/></symbol>
  <symbol id="icon-wind" viewBox="0 0 24 24"><line x1="12" y1="20" x2="12" y2="4"/><polyline points="6 10 12 4 18 10"/></symbol>
  <symbol id="icon-current" viewBox="0 0 24 24"><path d="M3 8 Q7 4 11 8 T19 8"/><path d="M3 14 Q7 10 11 14 T19 14"/><polyline points="16 11 19 14 16 17"/></symbol>
  <symbol id="icon-search-empty" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.2" y2="16.2"/><line x1="8.5" y1="11" x2="13.5" y2="11"/></symbol>
  <symbol id="icon-layers" viewBox="0 0 24 24"><polygon points="12 3 21 9 12 15 3 9"/><polyline points="4.5 13 12 18 19.5 13"/></symbol>
  <symbol id="icon-cube" viewBox="0 0 24 24"><path d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z"/><polyline points="4 7.5 12 12 20 7.5"/><line x1="12" y1="12" x2="12" y2="21"/></symbol>
  <symbol id="icon-locate" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.6"/><line x1="12" y1="2" x2="12" y2="5.5"/><line x1="12" y1="18.5" x2="12" y2="22"/><line x1="2" y1="12" x2="5.5" y2="12"/><line x1="18.5" y1="12" x2="22" y2="12"/></symbol>
  <symbol id="icon-flag" viewBox="0 0 24 24"><line x1="6" y1="3" x2="6" y2="21"/><path d="M6 4.5 H17 L14.4 8 L17 11.5 H6"/></symbol>
  <symbol id="icon-play" viewBox="0 0 24 24"><path d="M6 4 L20 12 L6 20 Z" style="fill:currentColor;stroke:none"/></symbol>
  <symbol id="icon-trophy" viewBox="0 0 24 24"><path d="M7 4 H17 V9 a5 5 0 0 1-10 0 Z"/><path d="M7 5.5 H4 a3.5 3.5 0 0 0 3.5 4.5"/><path d="M17 5.5 H20 a3.5 3.5 0 0 1-3.5 4.5"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="8.5" y1="21" x2="15.5" y2="21"/><line x1="9.5" y1="18" x2="14.5" y2="18"/></symbol>
  <symbol id="icon-doc" viewBox="0 0 24 24"><path d="M6 3 H14 L18 7 V21 H6 Z"/><polyline points="14 3 14 7 18 7"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15.5" x2="15" y2="15.5"/><line x1="9" y1="9" x2="12" y2="9"/></symbol>
  <symbol id="icon-compass" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polygon points="14.2 9.8 12 12 9.8 14.2 12 9.8 12 9.8 14.2 9.8" style="fill:currentColor;stroke:none"/><polygon points="12 5 13.6 10.4 12 12 10.4 10.4" style="fill:currentColor;stroke:none"/></symbol>
  <symbol id="icon-trend-up" viewBox="0 0 24 24"><polyline points="4 17 10 11 14 15 20 7"/><polyline points="14 7 20 7 20 13"/></symbol>
  <symbol id="icon-trend-down" viewBox="0 0 24 24"><polyline points="4 7 10 13 14 9 20 17"/><polyline points="14 17 20 17 20 11"/></symbol>
  <symbol id="icon-trend-flat" viewBox="0 0 24 24"><line x1="4" y1="12" x2="20" y2="12"/></symbol>
  <symbol id="icon-boat" viewBox="0 0 24 24"><path d="M12 2 V16"/><path d="M12 4 L18 14 L12 16 Z" style="fill:currentColor;stroke:none"/><path d="M4 18 H20 L18 21 H6 Z"/></symbol>
  <symbol id="icon-list" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></symbol>
  <symbol id="icon-pin" viewBox="0 0 24 24"><path d="M12 21 C12 21 5 13.5 5 9 a7 7 0 0 1 14 0 C19 13.5 12 21 12 21 Z"/><circle cx="12" cy="9" r="2.4"/></symbol>
  <symbol id="icon-calendar" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="16" rx="3"/><line x1="3.5" y1="10" x2="20.5" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></symbol>
  <symbol id="icon-check" viewBox="0 0 24 24"><polyline points="4.5 12.5 9.5 17.5 19.5 6.5"/></symbol>
  <symbol id="icon-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 6.5 12 12 16 14.5"/></symbol>
  <symbol id="icon-spark" viewBox="0 0 24 24"><path d="M12 2 L14 9 L21 12 L14 15 L12 22 L10 15 L3 12 L10 9 Z"/></symbol>
  <symbol id="icon-shield" viewBox="0 0 24 24"><path d="M12 3 L19 6 V11 C19 16 16 19.5 12 21 C8 19.5 5 16 5 11 V6 Z"/><polyline points="9 12 11.2 14.2 15.5 9.5"/></symbol>
</defs>
`;

export function IconSprite() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      dangerouslySetInnerHTML={{ __html: ICONS_MARKUP }}
    />
  );
}
