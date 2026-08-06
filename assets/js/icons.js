/* Zeedara Admin — inline SVG icon set (stroke-based, 24x24 grid).
   Mirrors the icon families used in the Zeedara Figma COMPONENTS page. */
(function (global) {
  'use strict';

  var P = {
    // navigation / shell
    dashboard: '<rect x="3" y="3" width="7.5" height="8.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="1.6"/><rect x="3" y="15" width="7.5" height="6" rx="1.6"/><rect x="13.5" y="12" width="7.5" height="9" rx="1.6"/>',
    box: '<path d="M21 8.5v7a2 2 0 0 1-1.06 1.77l-7 3.5a2 2 0 0 1-1.88 0l-7-3.5A2 2 0 0 1 3 15.5v-7"/><path d="M3.4 7.3l7.6-3.8a2 2 0 0 1 1.9 0l7.7 3.8a.8.8 0 0 1 0 1.4l-7.7 3.9a2 2 0 0 1-1.9 0L3.4 8.7a.8.8 0 0 1 0-1.4z"/><path d="M12 12.6V21"/>',
    tag: '<path d="M20.6 13.3l-7.3 7.3a2 2 0 0 1-2.8 0l-7.1-7.1A2 2 0 0 1 2.8 12V4.8A2 2 0 0 1 4.8 2.8H12a2 2 0 0 1 1.4.6l7.2 7.1a2 2 0 0 1 0 2.8z"/><circle cx="8" cy="8" r="1.4"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2.5 3h2.2a1 1 0 0 1 1 .8L6.2 6m0 0l1.5 8.2a2 2 0 0 0 2 1.6h8.1a2 2 0 0 0 2-1.6L21.5 6H6.2z"/>',
    layers: '<path d="M12 2.6l9 5.1-9 5.1-9-5.1 9-5.1z"/><path d="M3 12.8l9 5.1 9-5.1"/><path d="M3 17.2l9 5.1 9-5.1"/>',
    warehouse: '<path d="M3 21V9.6a2 2 0 0 1 1.2-1.84l7-3a2 2 0 0 1 1.6 0l7 3A2 2 0 0 1 21 9.6V21"/><path d="M7 21v-6.5h10V21"/><path d="M7 17.5h10"/><path d="M2 21h20"/>',
    users: '<path d="M16 20v-1.8a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20"/><circle cx="9" cy="7.5" r="3.5"/><path d="M22 20v-1.8a4 4 0 0 0-3-3.87"/><path d="M16.5 4.2a4 4 0 0 1 0 7.6"/>',
    user: '<path d="M19 20v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7.5" r="3.8"/>',
    star: '<path d="M12 2.8l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.65 6.2 20.7l1.1-6.45L2.6 9.65l6.5-.95L12 2.8z"/>',
    scissors: '<circle cx="6" cy="6" r="2.8"/><circle cx="6" cy="18" r="2.8"/><path d="M20 4L8.6 15.4"/><path d="M14.5 14.5L20 20"/><path d="M8.6 8.6l2.6 2.6"/>',
    sparkle: '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/>',
    quote: '<path d="M20.5 14.5a2 2 0 0 1-2 2H7.5l-4 3.5v-15a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v9.5z"/><path d="M8 8.5h8"/><path d="M8 12h5"/>',
    percent: '<path d="M19.5 4.5L4.5 19.5"/><circle cx="7.5" cy="7.5" r="2.8"/><circle cx="16.5" cy="16.5" r="2.8"/>',
    file: '<path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5l-5-5z"/><path d="M13.5 2.8V8h5"/><path d="M9 13h6"/><path d="M9 16.5h4"/>',
    truck: '<path d="M14.5 17.5V5.5a1 1 0 0 0-1-1H2.5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h1"/><path d="M14.5 8.5h3.9a1 1 0 0 1 .84.46l2.1 3.3a1 1 0 0 1 .16.54v4.7a1 1 0 0 1-1 1h-1"/><circle cx="6.5" cy="18.5" r="2"/><circle cx="17.5" cy="18.5" r="2"/><path d="M8.5 18.5h7"/>',
    chart: '<path d="M3 3v16.5a1.5 1.5 0 0 0 1.5 1.5H21"/><path d="M7.5 15.5V11"/><path d="M12 15.5V6.5"/><path d="M16.5 15.5v-6"/>',
    shield: '<path d="M12 21.5s7.5-3.4 7.5-9.2V5.6L12 2.7 4.5 5.6v6.7C4.5 18.1 12 21.5 12 21.5z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    settings: '<circle cx="12" cy="12" r="3.1"/><path d="M19.4 15a1.6 1.6 0 0 0 .33 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.33 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.47-.97H3a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.33-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 8.87 4.7 1.6 1.6 0 0 0 9.84 3.2V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.33 1.77v.02a1.6 1.6 0 0 0 1.47.97H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.47.97z"/>',
    image: '<rect x="3" y="3.5" width="18" height="17" rx="2.2"/><circle cx="8.6" cy="9.1" r="1.8"/><path d="M20.5 15.5l-4.4-4.4a1.6 1.6 0 0 0-2.3 0L4 20.5"/>',
    globe: '<circle cx="12" cy="12" r="9.2"/><path d="M2.8 12h18.4"/><path d="M12 2.8c2.4 2.5 3.7 5.8 3.7 9.2s-1.3 6.7-3.7 9.2c-2.4-2.5-3.7-5.8-3.7-9.2S9.6 5.3 12 2.8z"/>',
    heart: '<path d="M20.3 5.9a5.2 5.2 0 0 0-7.4 0L12 6.8l-.9-.9a5.2 5.2 0 0 0-7.4 7.4l8.3 8.3 8.3-8.3a5.2 5.2 0 0 0 0-7.4z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9.2"/><path d="M12 7v5.4l3.6 2.1"/>',
    bell: '<path d="M18 8.5a6 6 0 1 0-12 0c0 6.5-2.5 8-2.5 8h17s-2.5-1.5-2.5-8z"/><path d="M13.7 20.5a2 2 0 0 1-3.4 0"/>',
    search: '<circle cx="11" cy="11" r="7.2"/><path d="M20.5 20.5l-4.3-4.3"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',
    check: '<path d="M20 6.5L9.5 17 4 11.5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9.2"/><path d="M8.2 12.2l2.6 2.6 5-5"/>',
    xCircle: '<circle cx="12" cy="12" r="9.2"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/>',
    alert: '<path d="M10.3 3.6L2.1 17.5a2 2 0 0 0 1.7 3h16.4a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9.2"/><path d="M12 11v5.5"/><path d="M12 7.8h.01"/>',
    chevDown: '<path d="M6 9l6 6 6-6"/>',
    chevUp: '<path d="M18 15l-6-6-6 6"/>',
    chevRight: '<path d="M9 6l6 6-6 6"/>',
    chevLeft: '<path d="M15 6l-6 6 6 6"/>',
    arrowUp: '<path d="M12 19V5"/><path d="M5.5 11.5L12 5l6.5 6.5"/>',
    arrowDown: '<path d="M12 5v14"/><path d="M18.5 12.5L12 19l-6.5-6.5"/>',
    arrowRight: '<path d="M5 12h14"/><path d="M13 5.5l6.5 6.5L13 18.5"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="M11 5.5L4.5 12 11 18.5"/>',
    trend: '<path d="M22 7.5l-8.5 8.5-4-4L2 19.5"/><path d="M16.5 7.5H22v5.5"/>',
    dots: '<circle cx="12" cy="5.5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="18.5" r="1.4"/>',
    dotsH: '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
    edit: '<path d="M11 4.5H5a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h12.5a2 2 0 0 0 2-2v-6"/><path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.4-9.4z"/>',
    trash: '<path d="M3.5 6.5h17"/><path d="M8.5 6.5V4.2a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v2.3"/><path d="M5.5 6.5l1 13a2 2 0 0 0 2 1.8h7a2 2 0 0 0 2-1.8l1-13"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>',
    eye: '<path d="M1.8 12S5.5 4.8 12 4.8 22.2 12 22.2 12 18.5 19.2 12 19.2 1.8 12 1.8 12z"/><circle cx="12" cy="12" r="3.2"/>',
    eyeOff: '<path d="M9.9 5.1A9.5 9.5 0 0 1 12 4.8c6.5 0 10.2 7.2 10.2 7.2a18 18 0 0 1-2.3 3.3"/><path d="M6.2 6.4A18.5 18.5 0 0 0 1.8 12s3.7 7.2 10.2 7.2a9.3 9.3 0 0 0 4-.9"/><path d="M9.9 9.9a3.2 3.2 0 0 0 4.3 4.3"/><path d="M2.5 2.5l19 19"/>',
    download: '<path d="M21 15v3.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V15"/><path d="M7 10.5L12 15.5l5-5"/><path d="M12 15.5V3"/>',
    upload: '<path d="M21 15v3.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V15"/><path d="M17 8L12 3 7 8"/><path d="M12 3v12.5"/>',
    print: '<path d="M6.5 9V3.5h11V9"/><path d="M6.5 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1.5"/><rect x="6.5" y="14" width="11" height="7"/>',
    filter: '<path d="M21 4H3l7.2 8.5v6l3.6 2v-8L21 4z"/>',
    refresh: '<path d="M21 11.5A9 9 0 0 0 6.3 5.4L3 8.5"/><path d="M3 3.5v5h5"/><path d="M3 12.5a9 9 0 0 0 14.7 6.1L21 15.5"/><path d="M21 20.5v-5h-5"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
    list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3.5 6h.01"/><path d="M3.5 12h.01"/><path d="M3.5 18h.01"/>',
    logout: '<path d="M9.5 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4.5"/><path d="M16 16.5l4.5-4.5L16 7.5"/><path d="M20.5 12H9"/>',
    mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.2"/><path d="M3 6.5l8.1 5.6a2 2 0 0 0 2.3 0L21 6.5"/>',
    phone: '<path d="M21.5 16.9v2.6a2 2 0 0 1-2.2 2 19.5 19.5 0 0 1-8.5-3 19.2 19.2 0 0 1-5.9-5.9 19.5 19.5 0 0 1-3-8.6 2 2 0 0 1 2-2.2h2.6a2 2 0 0 1 2 1.7c.13.94.36 1.86.7 2.74a2 2 0 0 1-.45 2.1l-1.1 1.1a15.5 15.5 0 0 0 5.9 5.9l1.1-1.1a2 2 0 0 1 2.1-.45c.88.34 1.8.57 2.74.7a2 2 0 0 1 1.7 2.03z"/>',
    whatsapp: '<path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.5-4.5a8.4 8.4 0 1 1 15.5-4.4z"/><path d="M9 9.2c0 3 2.4 5.4 5.4 5.4.5 0 .9-.4.9-.9v-.9l-1.8-.6-.9.9a5.6 5.6 0 0 1-2.1-2.1l.9-.9-.6-1.8h-.9c-.5 0-.9.4-.9.9z"/>',
    pin: '<path d="M20 10.5c0 6-8 11.5-8 11.5s-8-5.5-8-11.5a8 8 0 0 1 16 0z"/><circle cx="12" cy="10.2" r="2.8"/>',
    money: '<rect x="2" y="6" width="20" height="12" rx="2.2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01"/><path d="M18 12h.01"/>',
    card: '<rect x="2" y="4.5" width="20" height="15" rx="2.2"/><path d="M2 9.5h20"/><path d="M6 15h3"/>',
    receipt: '<path d="M5 2.5h14v19l-2.3-1.6-2.4 1.6-2.3-1.6-2.4 1.6L7.3 21 5 21.5v-19z"/><path d="M9 7.5h6"/><path d="M9 11.5h6"/><path d="M9 15.5h3.5"/>',
    gift: '<rect x="2.5" y="8" width="19" height="4.5" rx="1"/><path d="M4 12.5V20a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 20v-7.5"/><path d="M12 8v13.5"/><path d="M12 8L9.6 4.2a2.4 2.4 0 1 0-3.6 3.1L8 8"/><path d="M12 8l2.4-3.8a2.4 2.4 0 1 1 3.6 3.1L16 8"/>',
    lock: '<rect x="4" y="10.5" width="16" height="11" rx="2.2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    key: '<circle cx="8" cy="15.5" r="4.5"/><path d="M11.4 12.6L20 4"/><path d="M16.5 4.5L20.5 8.5"/><path d="M14 7l3 3"/>',
    palette: '<path d="M12 21.5a9.5 9.5 0 1 1 0-19c5.2 0 9.5 3.6 9.5 8 0 2.5-2 4.5-4.5 4.5h-2a2 2 0 0 0-1.4 3.4 1.8 1.8 0 0 1-1.6 3.1z"/><circle cx="7.5" cy="11" r="1.3"/><circle cx="11" cy="7.5" r="1.3"/><circle cx="15.5" cy="9" r="1.3"/>',
    ruler: '<path d="M15.5 2.5l6 6L8.5 21.5l-6-6L15.5 2.5z"/><path d="M12 6l2 2"/><path d="M9 9l2 2"/><path d="M6 12l2 2"/>',
    droplet: '<path d="M12 2.7l5.3 5.3a7.5 7.5 0 1 1-10.6 0L12 2.7z"/>',
    flask: '<path d="M9.5 3h5"/><path d="M10.5 3v6L5.2 18.3A2 2 0 0 0 7 21.5h10a2 2 0 0 0 1.8-3.2L13.5 9V3"/><path d="M8 14.5h8"/>',
    store: '<path d="M3 9.5V20a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 20V9.5"/><path d="M2.2 9.5l1.6-5A1.5 1.5 0 0 1 5.3 3.5h13.4a1.5 1.5 0 0 1 1.5 1l1.6 5a3 3 0 0 1-4.9 2.4 3 3 0 0 1-4.9 0 3 3 0 0 1-4.9 0A3 3 0 0 1 2.2 9.5z"/>',
    package: '<path d="M16.5 3.5l-9 5.2"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7l8.7 5 8.7-5"/><path d="M12 22V12"/>',
    undo: '<path d="M3 8.5h11a5.5 5.5 0 0 1 0 11H8"/><path d="M7 4.5L3 8.5l4 4"/>',
    external: '<path d="M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5"/><path d="M14.5 3.5H21v6.5"/><path d="M21 3.5L11 13.5"/>',
    drag: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
    menu: '<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>',
    panelLeft: '<rect x="3" y="4" width="18" height="16" rx="2.2"/><path d="M9.5 4v16"/>',
    help: '<circle cx="12" cy="12" r="9.2"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.6 2.3c-.7.4-1.2 1-1.2 1.9v.3"/><path d="M12 17.2h.01"/>',
    send: '<path d="M21.5 2.5L11 13"/><path d="M21.5 2.5l-6.7 19-3.8-8.5L2.5 9.2l19-6.7z"/>',
    activity: '<path d="M22 12h-4l-3 8-4-16-3 8H2"/>',
    target: '<circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="12" r="5.2"/><circle cx="12" cy="12" r="1.4"/>',
    wallet: '<path d="M20 7.5H5.5A2.5 2.5 0 0 1 3 5m0 0A2.5 2.5 0 0 1 5.5 2.5H18a1 1 0 0 1 1 1v4"/><path d="M3 5v13a2.5 2.5 0 0 0 2.5 2.5H20a1 1 0 0 0 1-1V8.5a1 1 0 0 0-1-1"/><circle cx="16.5" cy="14" r="1.3"/>',
    book: '<path d="M3 4.5A2 2 0 0 1 5 2.5h5.5V21H5a2 2 0 0 0-2 2V4.5z"/><path d="M21 4.5a2 2 0 0 0-2-2h-5.5V21H19a2 2 0 0 1 2 2V4.5z"/>',
    briefcase: '<rect x="2.5" y="7" width="19" height="13.5" rx="2.2"/><path d="M8.5 7V4.8a1.8 1.8 0 0 1 1.8-1.8h3.4a1.8 1.8 0 0 1 1.8 1.8V7"/><path d="M2.5 12.5h19"/>',
    play: '<path d="M6.5 3.5l13 8.5-13 8.5V3.5z"/>',
    save: '<path d="M19.5 21h-15A1.5 1.5 0 0 1 3 19.5v-15A1.5 1.5 0 0 1 4.5 3h11L21 8.5v11A1.5 1.5 0 0 1 19.5 21z"/><path d="M7.5 21v-7.5h9V21"/><path d="M7.5 3v5h7"/>',
    megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h2.5L12 18.5V5.5L6.5 10H4a1 1 0 0 0-1 1z"/><path d="M6.5 14v4.5a1.5 1.5 0 0 0 3 0V16"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7"/><path d="M18.5 6a8 8 0 0 1 0 12"/>',
    scale: '<path d="M12 3v18"/><path d="M7 7h10"/><path d="M7 7L4 14h6L7 7z"/><path d="M17 7l-3 7h6l-3-7z"/><path d="M8.5 21h7"/>',
    users2: '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9.5" r="2.6"/><path d="M17.5 14.5a5 5 0 0 1 4 5.5"/>'
  };

  var Icons = {
    /** Render an icon as an SVG string. */
    get: function (name, opts) {
      opts = opts || {};
      var d = P[name];
      if (!d) d = P.help;
      var cls = opts.cls ? ' class="' + opts.cls + '"' : '';
      var size = opts.size ? ' width="' + opts.size + '" height="' + opts.size + '"' : '';
      var fill = name === 'star' && opts.fill ? 'currentColor' : 'none';
      return '<svg' + cls + size + ' viewBox="0 0 24 24" fill="' + fill +
        '" stroke="currentColor" stroke-width="' + (opts.w || 1.7) +
        '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
    },
    has: function (name) { return !!P[name]; },
    names: function () { return Object.keys(P); }
  };

  global.Icons = Icons;
  global.ico = Icons.get;
})(window);
