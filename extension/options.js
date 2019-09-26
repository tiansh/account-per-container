; (async function () {

  const iconSvg = window.iconSvg;

  [...document.querySelectorAll('[data-i18n]')].forEach(element => {
    element.textContent = browser.i18n.getMessage(element.dataset.i18n);
  });

  const ul = document.querySelector('ul');
  const removeButton = document.querySelector('#remove');

  let currentRule = null, currentIndex = 0;
  let renderCount = 0;
  const renderList = async function () {
    const index = ++renderCount;
    const rules = await browser.runtime.sendMessage({ method: 'getRuleList' });
    console.log(rules);
    const contexts = await browser.contextualIdentities.query({});
    if (renderCount !== index) return;
    [...document.querySelectorAll('.theader ~ li')].forEach(li => li.remove());
    if (currentIndex > rules.length) currentIndex = Math.max(0, rules.length - 1);
    if (!rules.length) {
      const li = document.createElement('li');
      li.classList.add('empty-list');
      const div = li.appendChild(document.createElement('div'));
      div.textContent = browser.i18n.getMessage('emptyRuleList');
      ul.appendChild(li);
    }
    rules.forEach((rule, index) => {
      const li = document.createElement('li');
      li.tabIndex = 0;
      const host = li.appendChild(document.createElement('span'));
      const container = li.appendChild(document.createElement('span'));
      const username = li.appendChild(document.createElement('span'));
      host.textContent = rule.host;
      username.textContent = rule.username;
      const context = contexts.find(context => context.cookieStoreId === rule.cookieStoreId);
      container.appendChild(iconSvg(context));
      const containerName = container.appendChild(document.createElement('i'));
      containerName.textContent = context.name;
      containerName.style.color = context.colorCode;
      ul.appendChild(li);
      const choseItem = function () {
        if (currentRule) currentRule.dom.classList.remove('cur');
        currentRule = { dom: li, rule };
        li.classList.add('cur');
        removeButton.disabled = false;
        currentIndex = index;
      };
      li.addEventListener('click', event => {
        choseItem();
      });
      li.addEventListener('keypress', event => {
        if ([13, 32].includes(event.keyCode)) choseItem();
      });
      if (index === currentIndex) choseItem();
    });
  };

  browser.storage.onChanged.addListener(renderList);
  renderList();

  removeButton.addEventListener('click', async function () {
    await browser.runtime.sendMessage({ method: 'removeRule', params: [currentRule.rule] });
    renderList();
  });

}());
