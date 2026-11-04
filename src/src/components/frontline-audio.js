/* 一线员工课件的语音入口：先完成视觉与交互状态，录音接入时无需重做页面结构。 */
window.HKR = window.HKR || {};
HKR.components = HKR.components || {};

(function () {
  var SPEAKER_ICON =
    '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
    '<path d="M7 13h5l6-5v16l-6-5H7z" />' +
    '<path d="M22.5 12.2c2.2 2.1 2.2 5.5 0 7.6" />' +
    '<path d="M26 9c4 3.8 4 10.2 0 14" />' +
    '</svg>';

  var PLAY_ICON =
    '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">' +
    '<path d="M7 5.4 14.4 10 7 14.6z" />' +
    '</svg>';

  HKR.components.frontlineAudio = {
    render: function (options) {
      var opts = options || {};
      var label = opts.label || '播放讲解';

      return HKR.core.ui.html`
        <button
          class="frontline-audio"
          type="button"
          data-action="frontline-audio"
          data-audio-state="idle"
          aria-label="${label}"
        >
          <span class="frontline-audio__icon" aria-hidden="true">${HKR.core.ui.raw(SPEAKER_ICON)}</span>
          <span class="frontline-audio__label">${label}</span>
          <span class="frontline-audio__play" aria-hidden="true">${HKR.core.ui.raw(PLAY_ICON)}</span>
        </button>
      `;
    }
  };
})();
