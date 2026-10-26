/* 一线员工登记页：进预习之前先留「酒店 + 姓名」。
 * 信息存在本机（localStorage），同时调用 report.identity 往后端发一条（没配置地址就空跑）。
 */
window.HKR = window.HKR || {};
HKR.pages = HKR.pages || {};

(function () {
  var ARROW =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10h11.2" /><path d="m11.2 5.8 4.2 4.2-4.2 4.2" /></svg>';

  function esc(value) {
    return HKR.core.ui.escapeHtml(value == null ? '' : String(value));
  }

  HKR.pages['frontline-identity'] = {
    render: function (host, ctx) {
      var ui = ctx.ui;
      var cfg = ctx.config.identityPage;
      var identity = ctx.store.getState().identity || { hotel: '', name: '' };
      var hotels = cfg.hotels || [];
      var datalist = hotels.length
        ? '<datalist id="fl-ident-hotels">' +
          hotels
            .map(function (name) {
              return '<option value="' + esc(name) + '"></option>';
            })
            .join('') +
          '</datalist>'
        : '';

      ui.setHtml(
        host,
        ui.html`
          <section class="fl-ident" aria-labelledby="fl-ident-title">
            <header class="fl-ident__head">
              <p class="fl-ident__kicker">${cfg.kicker}</p>
              <h1 class="fl-ident__title" id="fl-ident-title">${cfg.title}</h1>
              <p class="fl-ident__subtitle">${cfg.subtitle}</p>
            </header>

            <form class="fl-ident__form" novalidate>
              <label class="fl-ident__field">
                <span class="fl-ident__label">${cfg.hotelLabel}</span>
                <input
                  class="fl-ident__input"
                  type="text"
                  name="hotel"
                  value="${esc(identity.hotel)}"
                  placeholder="${cfg.hotelPlaceholder}"
                  maxlength="40"
                  autocomplete="organization"
                  enterkeyhint="next"
                  ${ui.raw(hotels.length ? 'list="fl-ident-hotels"' : '')}
                />
              </label>
              ${ui.raw(datalist)}

              <label class="fl-ident__field">
                <span class="fl-ident__label">${cfg.nameLabel}</span>
                <input
                  class="fl-ident__input"
                  type="text"
                  name="name"
                  value="${esc(identity.name)}"
                  placeholder="${cfg.namePlaceholder}"
                  maxlength="20"
                  autocomplete="name"
                  enterkeyhint="done"
                />
              </label>

              <p class="fl-ident__error" role="alert" hidden></p>

              <div class="fl-ident__action">
                <button class="btn btn--navy btn--lg fl-ident__submit" type="submit">
                  <span>${cfg.cta}</span>
                  <span class="btn__arrow" aria-hidden="true">${ui.raw(ARROW)}</span>
                </button>
              </div>
            </form>

            <p class="fl-ident__note">${cfg.note}</p>
          </section>
        `
      );

      var form = host.querySelector('.fl-ident__form');
      var hotelInput = host.querySelector('input[name="hotel"]');
      var nameInput = host.querySelector('input[name="name"]');
      var errorBox = host.querySelector('.fl-ident__error');

      function showError(message, focusEl) {
        errorBox.textContent = message;
        errorBox.hidden = false;
        if (focusEl) focusEl.focus();
      }

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var hotel = (hotelInput.value || '').trim();
        var name = (nameInput.value || '').trim();

        if (!hotel) {
          showError('先写一下酒店名称，方便把记录对到店里。', hotelInput);
          return;
        }
        if (!name) {
          showError('还差你的名字。', nameInput);
          return;
        }

        errorBox.hidden = true;
        var saved = ctx.store.saveIdentity(hotel, name);
        ctx.analytics.track('identity_saved', { hotel: saved.hotel, name: saved.name });
        /* 后端接口：没配置地址时这里是空跑，不会挡流程 */
        HKR.core.report.identity(saved);
        ctx.go(cfg.nextPageId);
      });

      /* 边打字边把红字收掉 */
      [hotelInput, nameInput].forEach(function (input) {
        input.addEventListener('input', function () {
          if (!errorBox.hidden) errorBox.hidden = true;
        });
      });
    }
  };
})();
