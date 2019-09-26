; (function () {

  /*
   * https://bugzilla.mozilla.org/show_bug.cgi?id=1377302
   * fill="context-fill" is not supported in non chrome codes
   * We use svg color matrix filter to color the icon correctly
   */
  /** @type {(context) => SVGElement} */
  const iconSvg = (function () {
    let index = 0;
    return function (context) {
      const hexColor = context.colorCode.replace(/[^0-9A-Fa-f]*/g, '');
      const rrggbb = hexColor.replace(/^(.)(.)(.)$/, '$1$1$2$2$3$3');
      const [red, green, blue] = rrggbb.split(/(?=(?:..)*$)/).map(v => Number.parseInt(v, 16) / 255);
      const matrix = `0 0 0 0 ${red} 0 0 0 0 ${green} 0 0 0 0 ${blue} 0 0 0 1 0`;
      return new DOMParser().parseFromString(`
<svg viewBox="0 0 32 32" color-interpolation-filters="sRGB" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <filter id="filter-${++index}"><feColorMatrix type="matrix" values="${matrix}" /></filter>
  <image xlink:href="${context.iconUrl}" filter="url(#filter-${index})" width="32px" height="32px" />
</svg>
`, 'image/svg+xml').documentElement;
    };
  }());

  window.iconSvg = iconSvg;

}());
