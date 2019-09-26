; (async function () {

  const iconSvg = window.iconSvg;

  const renderTemplate = async function (info, template) {
    const text = document.querySelector('#text');
    text.innerHTML = '';
    const contexts = await browser.contextualIdentities.query({});
    const context = contexts.find(context => context.cookieStoreId === info.cookieStoreId);
    template.replace(/[^{}]+|\{[^{}]+\}/g, part => {
      if (part === '{username}') {
        const username = document.createElement('strong');
        username.textContent = info.username;
        text.appendChild(username);
      } else if (part === '{host}') {
        const host = document.createElement('strong');
        host.textContent = info.host;
        text.appendChild(host);
      } else if (part === '{container}') {
        const icon = iconSvg(context);
        icon.style.width = '16px';
        text.appendChild(icon);
        const container = document.createElement('span');
        container.textContent = context.name;
        container.style.color = context.colorCode;
        text.appendChild(container);
      } else {
        text.appendChild(document.createTextNode(part));
      }
    });
  };

  let currentInfo = null;
  const renderInfo = async function (info) {
    currentInfo = info;
    const text = document.querySelector('#text');
    const confirm = document.querySelector('#confirm');

    confirm.style.display = 'none';
    if (!info.username) {
      text.textContent = browser.i18n.getMessage('inputUsernameNotice');
    } else if (info.username === (info.rule || {}).username) {
      renderTemplate(info, browser.i18n.getMessage('addedRuleNotice'));
    } else {
      renderTemplate(info, browser.i18n.getMessage('addRuleNotice'));
      confirm.style.display = 'inline';
      if (info.rule) {
        confirm.textContent = browser.i18n.getMessage('updateRuleConfirm');
      } else {
        confirm.textContent = browser.i18n.getMessage('addRuleConfirm');
      }
    }
  };

  const renderPage = async function () {
    const info = await browser.runtime.sendMessage({ method: 'getPageContext' });
    console.log(info);
    renderInfo(info);
  };

  const confirm = document.querySelector('#confirm');
  confirm.addEventListener('click', async event => {
    await browser.runtime.sendMessage({ method: 'addRule', params: [currentInfo] });
    renderPage();
  });

  renderPage();

}());

