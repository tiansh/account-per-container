; (async function () {

  const writeRules = function (rules) {
    return browser.storage.sync.set({ rules });
  };
  const loadRules = async function () {
    const rules = [];
    const storaged = (await browser.storage.sync.get({ rules: [] })).rules;
    if (Array.isArray(storaged)) {
      storaged.forEach(rule => {
        rules.push({
          cookieStoreId: String(rule.cookieStoreId),
          host: String(rule.host),
          username: String(rule.username),
        });
      });
    }
    if (JSON.stringify(rules) !== JSON.stringify(storaged)) {
      await writeRules(rules);
    }
    return rules;
  };
  /** @type {{cookieStoreId: string, host: string, username: string}[]} */
  const rules = await loadRules();
  const getRule = function ({ cookieStoreId, host }) {
    return rules.find(rule => rule.cookieStoreId === cookieStoreId && rule.host === host);
  };

  const context = new Map();

  const handlers = {};

  browser.runtime.onMessage.addListener(function ({ method, params = [] }, sender) {
    return handlers[method](sender, ...params);
  });

  const isContainedTab = async function (tab) {
    try {
      await browser.contextualIdentities.get(tab.cookieStoreId);
      return true;
    } catch (e) {
      return false;
    }
  };

  const isMyselfContained = async function (sender) {
    return isContainedTab(sender.tab);
  };
  handlers.isMyselfContained = isMyselfContained;

  const getTabInfo = async function (tab) {
    const isContained = await isContainedTab(tab);
    if (!isContained) return null;
    const cookieStoreId = tab.cookieStoreId;
    const host = new URL(tab.url).host;
    const rule = getRule({ cookieStoreId, host });
    return { cookieStoreId, host, rule };
  };

  const getPreferedUsername = async function (sender) {
    const { rule } = (await getTabInfo(sender.tab)) || { rule: null };
    return rule && rule.username;
  };
  handlers.getPreferedUsername = getPreferedUsername;

  const enablePageAction = function (tabId, info) {
    context.set(tabId, info);
    browser.pageAction.show(tabId);
  };

  const revokePageAction = tabId => {
    context.delete(tabId);
    browser.pageAction.hide(tabId);
  };

  const onUsernameChange = async function (sender, username) {
    if (username !== null) {
      const info = await getTabInfo(sender.tab);
      info.username = username;
      enablePageAction(sender.tab.id, info);
    } else {
      revokePageAction(sender.tab.id);
    }
  };
  handlers.onUsernameChange = onUsernameChange;

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.discarded || changeInfo.url) {
      revokePageAction(tabId);
    }
  });
  browser.tabs.onRemoved.addListener(tabId => {
    revokePageAction(tabId);
  });

  const getPageContext = async function () {
    const [activeTab] = await browser.tabs.query({ currentWindow: true, active: true });
    const info = context.get(activeTab.id);
    info.rule = getRule(info);
    return info;
  };
  handlers.getPageContext = getPageContext;

  const addRule = async function (sender, rule) {
    const cookieStoreId = rule.cookieStoreId;
    const host = rule.host;
    const username = rule.username;
    const oldRule = getRule({ cookieStoreId, host });
    if (!oldRule) {
      rules.push({ cookieStoreId, host, username });
    } else {
      oldRule.username = username;
    }
    await writeRules(rules);
  };
  handlers.addRule = addRule;

  const getRuleList = async function () {
    const contexts = await browser.contextualIdentities.query({});
    const cleanup = rules.filter(rule => contexts.some(context => context.cookieStoreId === rule.cookieStoreId));
    if (cleanup.length !== rules.length) {
      rules.splice(0, rules.length, ...cleanup);
      await writeRules(rules);
    }
    return rules;
  };
  handlers.getRuleList = getRuleList;

  const removeRule = async function (sender, rule) {
    const cookieStoreId = rule.cookieStoreId;
    const host = rule.host;
    const username = rule.username;
    const oldRule = getRule({ cookieStoreId, host });
    if (!oldRule) return;
    const index = rules.indexOf(oldRule);
    rules.splice(index, 1);
  };
  handlers.removeRule = removeRule;

}());
