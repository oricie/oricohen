/* The Jedox Integrator, alive, inside the Jedox sheet.
 *
 * Built at the screenshot's own size — 2856 by 2048, positions and colours
 * measured off it — and scaled to its frame, like the other rebuilt screens.
 *
 * It plays once each time the sheet opens. The flowgraph has the width to
 * itself and assembles top to bottom, each connector drawing after the step
 * it leaves, and a pulse of data runs through it from the CSV connection to
 * the last load, while the field transform's functions fill in and one is
 * picked. Then JedoxAI is opened: its drawer slides in, the flowgraph
 * narrows and the graph glides to stay centred, and the question about the
 * date format function goes in and the answer is typed out. It ends on the screenshot's own frame and stays there, with
 * the product's hover states from then on. Nothing opens or navigates.
 */
(function () {
  var STAGE_W = 2856, STAGE_H = 2048;

  function el(tag, cls, css, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (css) n.style.cssText = css;
    if (text != null) n.textContent = text;
    return n;
  }
  function put(parent, child) { parent.appendChild(child); return child; }
  function at(x, y, w, h) {
    return 'left:' + x + 'px;top:' + y + 'px;' +
           (w != null ? 'width:' + w + 'px;' : '') + (h != null ? 'height:' + h + 'px;' : '');
  }
  var SVG = 'http://www.w3.org/2000/svg';
  function svg(w, h, inner, css, cls) {
    var s = document.createElementNS(SVG, 'svg');
    s.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    s.setAttribute('width', w); s.setAttribute('height', h);
    if (css) s.style.cssText = css;
    if (cls) s.setAttribute('class', cls);
    s.innerHTML = inner;
    return s;
  }

  var ICON = {
    home:   '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
    pen:    '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/><circle cx="11" cy="13" r="1.3"/>',
    chart:  '<path d="M4 20h16"/><path d="M7 16V9"/><path d="M12 16V5"/><path d="M17 16v-4"/>',
    doc:    '<path d="M6 3h8l4 4v14H6z"/><path d="M9 11h2M13 11h2M9 14h2M13 14h2M9 17h2M13 17h2"/>',
    cal:    '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    fold:   '<path d="M3 6h7l2 2h9v11H3z"/><path d="M9 14v3M12 12v5M15 13v4"/>',
    db:     '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    users:  '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5a3.5 3.5 0 0 1 0 7M21 20c0-2.6-1.6-4.8-4-5.6"/>',
    cam:    '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    bell:   '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/>',
    spark:  '<path d="M12 3c.5 4.5 3.5 7.5 8 8-4.5.5-7.5 3.5-8 8-.5-4.5-3.5-7.5-8-8 4.5-.5 7.5-3.5 8-8z"/><path d="M19 3v3M17.5 4.5h3"/>',
    gear:   '<circle cx="12" cy="12" r="3"/><path d="M12 2.5l1.6 2.6 3-.6.9 2.9 2.8 1.2-.9 2.9 1.6 2.5-2.4 1.9.1 3-3 .4-1.6 2.6L12 19.8l-2.9 2.1-1.6-2.6-3-.4.1-3-2.4-1.9 1.6-2.5-.9-2.9 2.8-1.2.9-2.9 3 .6z"/>',
    menu:   '<path d="M4 7h16M4 12h16M4 17h16"/>',
    right:  '<path d="M9 6l6 6-6 6"/>',
    down:   '<path d="M6 9l6 6 6-6"/>',
    folder: '<path d="M3 6.5h7l2 2h9V19H3z"/>',
    brief:  '<path d="M3 8h18v12H3z"/><path d="M9 8V5h6v3M3 13h18"/><path d="M10 12h4v2h-4z"/>',
    tform:  '<rect x="3.5" y="3.5" width="6" height="6"/><rect x="14.5" y="3.5" width="6" height="6"/><rect x="3.5" y="14.5" width="6" height="6"/><rect x="14.5" y="14.5" width="6" height="6"/><path d="M9.5 6.5h5M6.5 9.5v5"/>',
    table:  '<rect x="3.5" y="4.5" width="17" height="15"/><path d="M3.5 9.5h17M3.5 14.5h17M9 4.5v15M14.5 4.5v15"/><path d="M3.5 4.5h17v5h-17z" fill="currentColor"/>',
    test:   '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M17 3v3.5h-3.5"/><circle cx="16.5" cy="17" r="4" fill="currentColor"/><path d="M14.8 17l1.2 1.2 2.2-2.4" stroke="#fff"/>',
    more:   '<circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/>',
    edit:   '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
    trash:  '<path d="M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14"/><path d="M10 9v8M12 9v8M14 9v8"/>',
    grip:   '<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>',
    delcol: '<path d="M3 5h13M3 9h13M3 13h9M3 17h7"/><circle cx="17.5" cy="17.5" r="4.5" fill="currentColor"/><path d="M15.5 17.5h4" stroke="#fff"/>',
    addcol: '<path d="M4 4v14M7 4v14M10 4v14M13 4v10"/><circle cx="17.5" cy="17.5" r="4.5" fill="currentColor"/><path d="M15.5 17.5h4M17.5 15.5v4" stroke="#fff"/>',
    map:    '<path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z"/><path d="M9 4v14M15 6v14"/>',
    link:   '<rect x="3" y="15" width="5" height="5"/><rect x="16" y="4" width="5" height="5"/><path d="M8 17.5c5 0 3-11 8-11"/>',
    info:   '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    focus:  '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    plus:   '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    minus:  '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    close:  '<path d="M6 6l12 12M18 6 6 18"/>',
    erase:  '<path d="M9 21l-5-5L15 5l5 5z" fill="currentColor"/><path d="M4 16l5 5"/>',
    up:     '<path d="M7 11V20H4V11zM7 11l4-8c1.5 0 2.5 1 2.2 2.6L12.6 9H18a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 16.8 20H7"/>',
    dn:     '<path d="M7 13V4H4v9zM7 13l4 8c1.5 0 2.5-1 2.2-2.6L12.6 15H18a2 2 0 0 0 2-2.3l-1.2-7A2 2 0 0 0 16.8 4H7"/>',
    copy:   '<rect x="8" y="8" width="11" height="13" rx="1.5"/><path d="M16 8V4.5A1.5 1.5 0 0 0 14.5 3h-8A1.5 1.5 0 0 0 5 4.5v11A1.5 1.5 0 0 0 6.5 17H8"/>',
    bulb:   '<path d="M9 18h6M10 21h4"/><path d="M12 5a5 5 0 0 0-3 9c.6.5 1 1.2 1 2h4c0-.8.4-1.5 1-2a5 5 0 0 0-3-9z"/><path d="M12 1v1.5M4 9H2.5M21.5 9H20M5.6 3.6l1 1M18.4 3.6l-1 1"/>',
    arrow:  '<path d="M5 12h14M13 6l6 6-6 6"/>',
    // White glyphs on the coloured step tiles.
    plug:   '<path d="M5 19l4-4M15 9l4-4"/><path d="M8.5 11.5l4 4-2 2a3 3 0 0 1-4-4zM15.5 12.5l-4-4 2-2a3 3 0 0 1 4 4z"/><path d="M4 20 20 4"/>',
    flask:  '<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3"/><path d="M7 15h10"/>',
    tree:   '<rect x="3.5" y="3.5" width="6" height="6"/><rect x="14.5" y="3.5" width="6" height="6"/><rect x="3.5" y="14.5" width="6" height="6"/><rect x="14.5" y="14.5" width="6" height="6"/><path d="M9.5 6.5h5M9.5 17.5h5M6.5 9.5v5"/>',
    dims:   '<path d="M4 4v16"/><rect x="7" y="4" width="13" height="4.5" rx="1"/><rect x="7" y="10" width="13" height="4.5" rx="1"/><rect x="7" y="16" width="13" height="4" rx="1"/>',
    gears:  '<circle cx="9" cy="9" r="2.3"/><path d="M9 3v2M9 13v2M3 9h2M13 9h2M4.8 4.8l1.4 1.4M11.8 11.8l1.4 1.4M4.8 13.2l1.4-1.4M11.8 6.2l1.4-1.4"/><circle cx="17" cy="17" r="1.8"/><path d="M17 13v1.6M17 19.4V21M13 17h1.6M19.4 17H21"/>'
  };
  function iconAt(name, cx, cy, size, color, sw, fill) {
    return svg(24, 24, ICON[name],
      'position:absolute;left:' + (cx - size / 2) + 'px;top:' + (cy - size / 2) + 'px;width:' + size +
      'px;height:' + size + 'px;color:' + color + ';fill:' + (fill || 'none') + ';stroke:' + color +
      ';stroke-width:' + (sw || 1.6) + ';stroke-linecap:round;stroke-linejoin:round');
  }

  // Flowgraph steps: card box, kind, name, tile colour, glyph, depth.
  var NODES = [
    [1626, 514, 'CSV', 'New connection', '#f95936', 'plug', 0],
    [1352, 698, 'Excel Extract', 'Excel_component', '#d48f00', 'flask', 1],
    [1888, 698, 'JSON Extract', 'Orderlines 4', '#d48f00', 'flask', 1],
    [1076, 922, 'Tree view', 'Tree Order', '#25ab0c', 'tree', 2],
    [1628, 928, 'Field Transform (1)', 'OrdersData_Trans', '#25ab0c', 'tree', 2],
    [1076, 1114, 'Tree view', 'New_dimension extract', '#25ab0c', 'tree', 3],
    [1628, 1114, 'Field Transform (2)', 'NEW_Orders_transform', '#25ab0c', 'tree', 3],
    [1340, 1276, 'Load: Dimension', 'Data_timeline', '#075ae2', 'dims', 4],
    [1340, 1454, 'Job: Standard', 'Orders Load 1', '#9b69dd', 'gears', 5],
    [1340, 1634, 'Job: Standard', 'Orders load 3', '#9b69dd', 'gears', 6]
  ];
  // Connectors, each drawn once the step it leaves is in: path, depth.
  var EDGES = [
    ['M1866 610C1866 646 1846 655 1810 655H1630C1598 655 1592 670 1592 694', 0],
    ['M1866 610C1866 646 1886 655 1922 655H2092C2124 655 2128 670 2128 694', 0],
    ['M1592 794C1592 842 1570 858 1532 858H1356C1320 858 1314 876 1314 918', 1],
    ['M1592 794C1592 842 1614 860 1652 860H1828C1860 860 1866 880 1866 924', 1],
    ['M2128 794C2128 836 2150 856 2196 862H2330', 1],
    ['M1314 1018V1110', 2],
    ['M1866 1024V1110', 2],
    ['M1314 1210C1314 1234 1328 1242 1356 1242H1542C1572 1242 1580 1254 1580 1272', 3],
    ['M1866 1210C1866 1234 1852 1242 1824 1242H1618C1588 1242 1580 1254 1580 1272', 3],
    ['M1580 1372V1450', 4],
    ['M1580 1550V1630', 5]
  ];
  // The run of data, as the connectors it takes in order.
  var RUN = [0, 3, 6, 8, 9, 10];

  var ANSWER = [
    ['To use the DateFormat function in a field', 'transform within Jedox, you need to',
     'specify the source format, target format,', 'default value, and language parameters.'],
    ['The source format defines the date format', 'of the input field, such as ‘dd.MM.yyyy’.'],
    ['The target format specifies the desired', 'output format, like ‘MMM’. You can also set',
     'a default value to use when the incoming', 'value is null.'],
    ['Additionally, you can define the language', 'using standard language and country',
     'codes, such as ‘en_US’ for English.'],
    ['The DateFormat function allows you to', 'convert a date or time input into another',
     'format, facilitating data transformation in', 'your projects.']
  ];
  var ANSWER_Y = [764, 916, 1000, 1152, 1270];

  function build(host) {
    host.innerHTML = '';
    var ui = put(host, el('span', 'jf'));
    ui.setAttribute('aria-hidden', 'true');
    var st = put(ui, el('span', 'jf-stage', 'width:' + STAGE_W + 'px;height:' + STAGE_H + 'px'));

    // Rail.
    var rail = put(st, el('span', 'jf-rail', at(0, 0, 95, STAGE_H)));
    ['home', 'pen', 'chart', 'doc', 'cal', 'fold'].forEach(function (n, i) {
      put(rail, iconAt(n, 47, 55 + i * 84, 38, '#62748e', 1.7));
    });
    put(rail, el('span', 'jf-rail-on', at(12, 520, 70, 80)));
    put(rail, iconAt('db', 47, 560, 38, '#155dfc', 1.7));
    put(rail, iconAt('users', 47, 643, 38, '#62748e', 1.7));
    put(rail, iconAt('cam', 47, 727, 38, '#62748e', 1.7));
    put(rail, el('span', 'jf-rule', at(0, 1766, 95, 0)));
    [['bell', 1827], ['spark', 1904], ['gear', 1980]].forEach(function (r) {
      put(rail, iconAt(r[0], 47, r[1], 38, '#62748e', 1.7));
    });

    // Breadcrumb bar.
    var top = put(st, el('span', 'jf-top', at(95, 0, STAGE_W - 95, 97)));
    put(top, iconAt('menu', 41, 49, 32, '#1f1f1f', 2));
    // Chevron, icon and label positions, as the screenshot has them.
    var crumbs = [[null, 'Integrator', 0, 0, 98], ['folder', 'Global Projects', 260, 309, 342],
                  ['brief', 'Project Abc', 573, 621, 654], ['tform', 'Transforms', 840, 887, 920],
                  ['table', 'FieldTransform transform', 1103, 1151, 1183]];
    crumbs.forEach(function (c) {
      if (c[2]) put(top, iconAt('right', c[2], 49, 26, '#1f1f1f', 2.2));
      if (c[0]) put(top, iconAt(c[0], c[3], 49, 36, '#45556c', 1.6));
      put(top, el('span', 'jf-crumb', at(c[4], 0, null, 96), c[1]));
    });
    var ai = put(top, el('span', 'jf-ai', at(2349, 16, 197, 64)));
    put(ai, iconAt('spark', 38, 32, 34, '#0042ae', 1.4, '#0042ae'));
    put(ai, el('span', null, at(70, 0, null, 64), 'JedoxAI'));
    put(top, iconAt('bell', 2595, 47, 34, '#45556c', 1.7));
    put(top, el('span', 'jf-dot', at(2602, 27, 12, 12)));
    put(top, el('span', 'jf-vr', at(2643, 32, 0, 30)));
    put(top, el('span', 'jf-avatar', at(2673, 23, 48, 48), 'JD'));

    // Title bar.
    var bar = put(st, el('span', 'jf-bar', at(95, 97, STAGE_W - 95, 96)));
    put(bar, iconAt('test', 41, 49, 36, '#1f1f1f', 1.8));
    put(bar, el('span', 'jf-title', at(70, 0, null, 96), 'Test'));
    put(bar, el('span', 'jf-save', at(2527, 17, 122, 64), 'Save'));
    put(bar, iconAt('more', 2695, 49, 34, '#1f1f1f', 1.6, '#1f1f1f'));

    // Left: the transform's settings.
    var lp = put(st, el('span', 'jf-panel', at(120, 226, 896, 1176)));
    function label(p, x, y, t, cls) { return put(p, el('span', cls || 'jf-label', at(x, y, null, 40), t)); }
    function select(p, x, y, w, t) {
      var s = put(p, el('span', 'jf-input', at(x, y, w, 64)));
      if (t) put(s, el('span', 'jf-input-t', at(18, 0, null, 60), t));
      put(s, iconAt('down', w - 32, 31, 26, '#1f1f1f', 2.2));
      return s;
    }
    label(lp, 32, 22, 'Data source');
    select(lp, 32, 66, 600, 'Excel_datasheet');
    label(lp, 32, 152, 'Tree format');
    select(lp, 32, 196, 600, null);
    label(lp, 32, 292, 'Functions', 'jf-h');

    var fn = put(lp, el('span', 'jf-table', at(32, 350, 832, 352)));
    var fh = put(fn, el('span', 'jf-thead', at(0, 0, 832, 64)));
    put(fh, el('span', 'jf-th', at(72, 0, null, 64), 'Function name Type'));
    put(fh, el('span', 'jf-iconbtn', at(768, 8, 48, 48)));
    put(fh, iconAt('delcol', 792, 32, 30, '#1f1f1f', 1.6));
    var FN = [['newDate', 'DateFormat', 180], ['newDate', 'Groovy', 184], ['newDate', 'Concatenation', 184]];
    var fnRows = FN.map(function (r, i) {
      var row = put(fn, el('span', 'jf-tr jf-fn' + (i === 2 ? ' jf-fn--pick' : ''), at(0, 65 + i * 96, 832, 95) + '--i:' + i));
      put(row, iconAt('grip', 24, 47, 28, '#c4c4c4', 1, '#c4c4c4'));
      put(row, el('span', 'jf-td', at(72, 0, null, 95), r[0]));
      put(row, el('span', 'jf-td', at(r[2] + 72, 0, null, 95), r[1]));
      put(row, iconAt('edit', 651, 47, 34, i === 2 ? '#155dfc' : '#5b5b5b', 1.5)).classList.add('jf-edit');
      put(row, iconAt('trash', 724, 47, 34, '#5b5b5b', 1.5));
      put(row, iconAt('more', 795, 47, 30, '#000000', 1.6, '#000000'));
      return row;
    });

    label(lp, 32, 734, 'Target', 'jf-h');
    var tg = put(lp, el('span', 'jf-table', at(32, 792, 832, 352)));
    var th = put(tg, el('span', 'jf-thead', at(0, 0, 832, 64)));
    put(th, el('span', 'jf-th', at(72, 0, null, 64), 'Field Name'));
    put(th, el('span', 'jf-th', at(262, 0, null, 64), 'Input'));
    put(th, iconAt('addcol', 729, 32, 30, '#1f1f1f', 1.6));
    put(th, iconAt('delcol', 793, 32, 30, '#1f1f1f', 1.6));
    [['Field name', 'Date'], ['Field name', 'Category'], ['Enter name', 'Enter name']].forEach(function (r, i) {
      var row = put(tg, el('span', 'jf-tr' + (i === 2 ? ' jf-tr--ph' : ''), at(0, 65 + i * 96, 832, 95) + '--i:' + (i + 3)));
      put(row, iconAt('grip', 24, 47, 28, '#c4c4c4', 1, '#c4c4c4'));
      put(row, el('span', 'jf-td', at(72, 0, null, 95), r[0]));
      put(row, el('span', 'jf-td', at(262 + (i === 1 ? 2 : 0), 0, null, 95), r[1]));
      put(row, iconAt('link', 622, 47, 34, '#1f1f1f', 1.5));
      put(row, iconAt('trash', 796, 47, 34, '#5b5b5b', 1.5));
    });

    var ap = put(st, el('span', 'jf-panel', at(120, 1434, 896, 576)));
    put(ap, iconAt('info', 48, 48, 34, '#1f1f1f', 1.6));
    put(ap, el('span', 'jf-h2', at(81, 0, null, 94), 'Advanced parameters'));
    put(ap, el('span', 'jf-rule', at(0, 94, 896, 0)));
    label(ap, 32, 112, 'Column include pattern');
    put(ap, el('span', 'jf-input', at(32, 158, 600, 64)));
    label(ap, 32, 242, 'Column exclude pattern');
    put(ap, el('span', 'jf-input', at(32, 288, 600, 64)));
    label(ap, 32, 372, 'Use caching');
    put(ap, el('span', 'jf-cb', at(32, 418, 32, 32)));
    put(ap, el('span', 'jf-td', at(73, 410, null, 48), 'Yes'));

    // Middle: the flowgraph.
    var fp = put(st, el('span', 'jf-panel jf-flowpanel', at(1048, 226, 1090, 1790)));
    put(fp, el('span', 'jf-label jf-flow-t', at(32, 22, null, 48), 'Flowgraph'));
    put(fp, el('span', 'jf-vr', at(168, 32, 0, 30)));
    put(fp, el('span', 'jf-muted', at(186, 22, null, 48), 'Edit Mode'));
    // The close sits against the panel's right edge, which moves.
    var fx = put(fp, iconAt('close', 1034, 46, 30, '#1f1f1f', 2));
    fx.style.left = 'auto'; fx.style.right = '39px';
    var cv = put(fp, el('span', 'jf-canvas', at(0, 90, 1088, 1698)));
    // The graph itself, so it can glide to stay centred as the panel narrows.
    var gl = put(cv, el('span', 'jf-graph', at(0, 0, 1088, 1698)));
    // Canvas coordinates are the screenshot's, less the canvas's origin.
    var OX = 1049, OY = 318;
    var eg = '';
    EDGES.forEach(function (e, i) {
      // The JSON branch runs on to steps outside the view; it fades as it goes.
      eg += '<path class="jf-edge" style="--d:' + e[1] + (i === 4 ? ';stroke:url(#jf-fade)' : '') + '" pathLength="1" d="' + e[0] + '"/>';
    });
    eg = '<defs><linearGradient id="jf-fade" gradientUnits="userSpaceOnUse" x1="2150" y1="0" x2="2330" y2="0">' +
         '<stop offset="0" stop-color="#8793a6"/><stop offset="1" stop-color="#8793a6" stop-opacity="0"/></linearGradient></defs>' + eg;
    var edges = put(gl, svg(STAGE_W, STAGE_H, '<g transform="translate(' + (-OX) + ' ' + (-OY) + ')">' + eg +
      '<g class="jf-heads"></g><circle class="jf-pulse" r="9" cx="0" cy="0"/></g>',
      'position:absolute;left:0;top:0;overflow:visible', 'jf-edges'));
    var paths = edges.querySelectorAll('.jf-edge');
    var heads = edges.querySelector('.jf-heads');
    var pulse = edges.querySelector('.jf-pulse');
    // Arrowheads and ports, placed from each path's own ends.
    paths.forEach(function (p, i) {
      var L = p.getTotalLength(), end = p.getPointAtLength(L), pre = p.getPointAtLength(L - 6), s = p.getPointAtLength(0);
      var ang = Math.atan2(end.y - pre.y, end.x - pre.x) * 180 / Math.PI;
      var d = EDGES[i][1];
      if (i !== 4) heads.innerHTML += '<path class="jf-head" style="--d:' + d + '" d="M-10 -7L0 0L-10 7" transform="translate(' + end.x + ' ' + end.y + ') rotate(' + ang + ')"/>';
      heads.innerHTML += '<circle class="jf-port" style="--d:' + d + '" cx="' + s.x + '" cy="' + s.y + '" r="5"/>';
    });

    var nodes = NODES.map(function (n) {
      var c = put(gl, el('span', 'jf-node', at(n[0] - OX, n[1] - OY, 480, 96) + '--d:' + n[6]));
      var t = put(c, el('span', 'jf-tile', at(16, 16, 64, 64) + 'background:' + n[4]));
      put(t, iconAt(n[5], 32, 32, 40, '#ffffff', 1.8));
      put(c, el('span', 'jf-kind', at(96, 12, null, 40), n[2]));
      put(c, el('span', 'jf-name', at(96, 46, null, 42), n[3]));
      put(c, iconAt('more', 448, 48, 34, '#000000', 1.6, '#000000'));
      return c;
    });

    var zb = put(cv, el('span', 'jf-zoom', at(1080 - OX, 1886 - OY, 540, 92)));
    put(zb, el('span', 'jf-zoom-on', at(14, 14, 64, 64)));
    [['edit', 46, '#155dfc'], ['map', 118], ['focus', 190], ['plus', 284], ['minus', 356]].forEach(function (z) {
      put(zb, iconAt(z[0], z[1], 46, 34, z[2] || '#1f1f1f', 1.6));
    });
    put(zb, el('span', 'jf-vr', at(237, 30, 0, 32)));
    var sel = put(zb, el('span', 'jf-input', at(396, 14, 130, 64)));
    put(sel, el('span', 'jf-input-t', at(18, 0, null, 60), '50%'));
    put(sel, iconAt('down', 100, 31, 24, '#1f1f1f', 2.2));

    // Right: JedoxAI.
    var aip = put(st, el('span', 'jf-aipanel', at(2155, 194, 701, STAGE_H - 194)));
    put(aip, el('span', 'jf-label', at(27, 28, null, 40), 'JedoxAI'));
    put(aip, iconAt('erase', 1307 + 1428 - 2155, 242 - 194, 30, '#1f1f1f', 1.6));
    put(aip, iconAt('close', 1380 + 1428 - 2155, 242 - 194, 30, '#1f1f1f', 2));
    put(aip, el('span', 'jf-rule', at(0, 95, 701, 0)));
    function bubble(x, y, w, h, lines, cls) {
      var b = put(aip, el('span', 'jf-bub ' + cls, at(x - 2155, y - 194, w, h)));
      lines.forEach(function (l, i) { put(b, el('span', 'jf-line', at(32, 33 + i * 34, null, 34), l)); });
      return b;
    }
    bubble(2188, 322, 636, 198, ['I’m here to help you navigate features,', 'answer questions, and provide guidance',
      'on using Jedox effectively.', 'Just type your question to get started.'], 'jf-bub--ai');
    var ask = bubble(2188, 554, 556, 128, ['how do i use date format function in', 'a field transform'], 'jf-bub--me');
    var ans = put(aip, el('span', 'jf-bub jf-bub--ai jf-ans', at(2188 - 2155, 714 - 194, 632, 682)));
    var lineEls = [];
    ANSWER.forEach(function (p, pi) {
      p.forEach(function (l, li) {
        var n = put(ans, el('span', 'jf-line', at(32, ANSWER_Y[pi] - 714 - 17 + li * 34, null, 34)));
        n.dataset.text = l;
        lineEls.push(n);
      });
    });
    var kb = put(ans, el('span', 'jf-kb', at(2711 - 2188, 1360 - 714, 30, 26), 'KB'));
    var dots = put(ans, el('span', 'jf-typing', at(32, 30, 90, 30)));
    for (var i = 0; i < 3; i++) put(dots, el('span', null, at(i * 24, 8, 12, 12) + '--k:' + i));
    var fb = put(aip, el('span', 'jf-fb', at(2254 - 2155, 1432 - 194, 160, 46)));
    put(fb, iconAt('up', 19, 23, 34, '#5b5b5b', 1.5));
    put(fb, iconAt('dn', 68, 23, 34, '#5b5b5b', 1.5));
    put(fb, iconAt('copy', 124, 27, 32, '#5b5b5b', 1.5));
    var box = put(aip, el('span', 'jf-ask', at(2188 - 2155, 1852 - 194, 636, 160)));
    put(box, el('span', 'jf-caret', at(15, 25, 2, 34)));
    var kn = put(box, el('span', 'jf-know', at(11, 83, 226, 64)));
    put(kn, iconAt('bulb', 34, 32, 36, '#155dfc', 1.5));
    put(kn, el('span', null, at(74, 0, null, 64), 'Knowledge'));
    put(box, el('span', 'jf-send', at(559, 83, 64, 64)));
    put(box, iconAt('arrow', 591, 115, 28, '#1f1f1f', 2));

    // Fit.
    function fit() { st.style.transform = 'scale(' + (host.clientWidth / STAGE_W) + ')'; }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(host);

    // Play.
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var timers = [], raf = 0;
    function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function fill() { lineEls.forEach(function (n) { n.textContent = n.dataset.text; }); }

    function type(k) {
      // Word by word, a line at a time, as the product streams its answer.
      if (k >= lineEls.length) { ui.classList.add('is-answered'); return; }
      var n = lineEls[k], words = n.dataset.text.split(' '), w = 0;
      (function word() {
        w++;
        n.textContent = words.slice(0, w).join(' ');
        if (w < words.length) later(34, word);
        else later(ANSWER.some(function (p) { return p[p.length - 1] === n.dataset.text; }) ? 160 : 40, function () { type(k + 1); });
      })();
    }

    function run() {
      // The data run: one pulse along the main line, each step lighting as it passes.
      var segs = RUN.map(function (i) { return paths[i]; });
      var lens = segs.map(function (p) { return p.getTotalLength(); });
      var total = lens.reduce(function (a, b) { return a + b; }, 0);
      var order = [0, 1, 4, 6, 7, 8, 9];
      var dur = 2600, t0 = performance.now();
      ui.classList.add('is-running');
      nodes[order[0]].classList.add('is-hot');
      (function step(now) {
        var d = Math.min(1, (now - t0) / dur) * total, k = 0;
        while (k < lens.length - 1 && d > lens[k]) { d -= lens[k]; k++; }
        var pt = segs[k].getPointAtLength(Math.min(d, lens[k]));
        pulse.setAttribute('cx', pt.x); pulse.setAttribute('cy', pt.y);
        nodes.forEach(function (n, i) { n.classList.toggle('is-hot', i === order[k + (d >= lens[k] - 1 ? 1 : 0)]); });
        if (now - t0 < dur) raf = requestAnimationFrame(step);
        else { nodes[order[order.length - 1]].classList.add('is-hot'); later(500, function () {
          nodes.forEach(function (n) { n.classList.remove('is-hot'); }); ui.classList.remove('is-running'); }); }
      })(t0);
    }

    var REST = 'jf is-graph is-rows is-pick is-drawer is-asked is-answered is-idle';
    function settle() { ui.className = REST; fill(); }
    function play() {
      ui.className = 'jf is-resetting';
      lineEls.forEach(function (n) { n.textContent = ''; });
      void ui.offsetWidth;
      ui.classList.remove('is-resetting');
      later(200,   function () { ui.classList.add('is-graph', 'is-rows'); });
      later(2200,  function () { ui.classList.add('is-pick'); });
      later(2600,  run);
      // JedoxAI is asked for: the button takes the press, the drawer comes
      // in, and the flowgraph makes room for it.
      later(5700,  function () { ui.classList.add('is-press'); });
      later(5900,  function () { ui.classList.remove('is-press'); ui.classList.add('is-drawer'); });
      later(6900,  function () { ui.classList.add('is-asked'); });
      later(7500,  function () { ui.classList.add('is-thinking'); });
      later(8600,  function () { ui.classList.remove('is-thinking'); ui.classList.add('is-writing'); type(0); });
      later(14200, function () { ui.classList.add('is-idle'); });
    }
    if (reduce) { settle(); return; }
    if (window.IntersectionObserver) {
      var seen = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { seen.disconnect(); play(); }
      }, { threshold: 0.25 });
      seen.observe(host);
    } else play();
  }

  function scan(root) {
    (root.querySelectorAll ? root.querySelectorAll('.live-flow:not([data-built])') : []).forEach(function (h) {
      h.setAttribute('data-built', '');
      build(h);
    });
  }
  scan(document);
  if (window.MutationObserver) {
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n.parentNode || n); }); });
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
