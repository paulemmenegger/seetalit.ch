'use strict';
/* SeetalIT Endversion: Einblenden, Handschrift, Ortsprüfung und untere Knopfleiste.
   Ohne Bibliotheken, ohne externe Requests. Reine Logik wird in test.mjs geprüft. */

/* Ortsnamen vergleichbar machen: Gross/Klein, Umlaute (ö/oe/o), «LU» am Ende egal. */
function norm(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[\s,]+(kanton luzern|luzern|lu)\.?$/, '')
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u')
    .replace(/[^a-z]/g, '');
}
if (typeof module !== 'undefined') module.exports = { norm: norm };

if (typeof document !== 'undefined') (function () {
  var root = document.documentElement;
  var map = document.querySelector('.map');
  var show = function (el) { el.classList.add('is-in'); };

  /* 1. Einblenden: nur wenn index.html die Klasse .js gesetzt hat */
  if (root.classList.contains('js')) {
    var intro = document.querySelector('.intro');
    var startIntro = function () { if (intro) show(intro); };
    // Handschrift erst mit geladener Caveat, aber nie länger als 700 ms warten
    if (document.fonts && document.fonts.ready) {
      Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 700); })]).then(startIntro);
    } else startIntro();

    var items = [].slice.call(document.querySelectorAll('.rv, .note, .sign'));
    if (map) items.push(map);

    if (!('IntersectionObserver' in window)) {
      items.forEach(show);
    } else {
      var io = new IntersectionObserver(function (entries) {
        var n = 0; // was gleichzeitig erscheint, kommt nacheinander
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.style.setProperty('--d', (n++ * 90) + 'ms');
          show(e.target);
          io.unobserve(e.target);
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
      items.forEach(function (el) { io.observe(el); });

      // Sicherheitsnetz: nach 1.5 s alles zeigen, was schon im Fenster oder darüber liegt
      setTimeout(function () {
        startIntro();
        items.forEach(function (el) {
          if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < innerHeight) { show(el); io.unobserve(el); }
        });
      }, 1500);
    }
  }
  /* Am Handy: untere Knopfleiste ausblenden, solange Karten- oder Kontakt-Knöpfe sichtbar sind (keine doppelten Knöpfe) */
  var dock = document.querySelector('.dock');
  var twins = [].slice.call(document.querySelectorAll('.card-btns, .cta, .contact-main'));
  if (dock && twins.length && 'IntersectionObserver' in window) {
    var seen = new Set();
    var dockIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
      dock.classList.toggle('away', seen.size > 0);
    });
    twins.forEach(function (t) { dockIO.observe(t); });
  }
  window.seetalReady = true;

  /* 2. «Komme ich zu dir?»: alles lokal, nichts wird gesendet */
  var box = document.querySelector('.check');
  var input = document.getElementById('ort');
  var out = document.getElementById('antwort');
  var btn = document.getElementById('ort-btn');
  if (box && input && out && btn && map) {
    box.hidden = false;
    var places = {};
    [].forEach.call(map.querySelectorAll('.m-place'), function (g) { places[norm(g.getAttribute('data-name'))] = g; });
    /* Alle Orte der Vorschlagsliste liegen im Umkreis, auch die ohne Punkt auf der Karte (z.B. Urswil) */
    var names = {};
    [].forEach.call(document.querySelectorAll('#orte option'), function (o) { names[norm(o.value)] = o.value; });

    var mark = function (hit) {
      Object.keys(places).forEach(function (k) { places[k].classList.toggle('hit', places[k] === hit); });
      map.classList.toggle('picking', !!hit);
    };
    var say = function (cls, text, call) {
      out.className = 'answer' + (cls ? ' ' + cls : '');
      out.textContent = text;
      if (call) {
        var a = document.createElement('a');
        a.href = 'tel:+41775303022';
        a.textContent = '077 530 30 22';
        out.appendChild(document.createTextNode(' '));
        out.appendChild(a);
      }
    };
    var check = function (final) {
      var key = norm(input.value);
      var g = places[key];
      if (names[key]) {
        mark(g); if (g) show(map);
        say('yes', 'Ja, ' + names[key] + ' liegt im Umkreis von 10 km. Die Anfahrt ist inklusive. Ruf an für einen Termin:', true);
        return;
      }
      mark(null);
      if (final && key) say('no', 'Dieses Dorf steht nicht auf meiner Liste. Ruf kurz an, dann sage ich dir, ob die Anfahrt inklusive ist:', true);
      else if (final) say('no', 'Gib zuerst dein Dorf ein, zum Beispiel Ballwil.');
      else say('', '');
    };
    input.addEventListener('input', function () { check(false); });
    input.addEventListener('change', function () { check(true); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); check(true); } });
    btn.addEventListener('click', function () { check(true); });
  }
})();
