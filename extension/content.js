; (async function () {

  const isMyselfContained = function () {
    return browser.runtime.sendMessage({ method: 'isMyselfContained' });
  };

  const isContained = await isMyselfContained();
  if (!isContained) return;

  const getPreferedUsername = function () {
    return browser.runtime.sendMessage({ method: 'getPreferedUsername' });
  };

  const onUsernameChange = function (username) {
    browser.runtime.sendMessage({ method: 'onUsernameChange', params: [username] });
  };

  /**
   * We update password field so built-in password manager will fill password for it.
   * @param {HTMLInputElement} input
   * @param {string} value
   */
  const setInputValue = function (input, value) {
    input.value = value;
    if (!input.form) return;
    Array.from(input.form.elements).forEach(element => {
      if (element.type !== 'password') return;
      const placeholder = document.createElement('x-temp-placeholder');
      const parent = element.parentNode;
      parent.replaceChild(placeholder, element);
      parent.replaceChild(element, placeholder);
    });
  };

  let oldValue = null;
  /**
   * Notice background when user inputed
   * @param {Event} event
   */
  const loginInput = function (event) {
    /** @type {HTMLInputElement} */
    const input = event.target;
    if (input.value === oldValue) return;
    oldValue = input.value;
    onUsernameChange(input.value);
  };

  /**
   * Once login input detected, we fill it if we can, and also let background know
   * @param {HTMLInputElement} input
   */
  const onLoginDetected = async function (input) {
    input.addEventListener('input', loginInput);
    onUsernameChange(input.value);
    if (!input.value) {
      const username = await getPreferedUsername();
      if (username) setInputValue(input, username);
      onUsernameChange(input.value);
    }
  };

  /**
   * In case login input is removed from document
   * @param {HTMLInputElement} oldInput
   */
  const onLoginLost = function (oldInput) {
    oldInput.removeEventListener('input', loginInput);
  };

  /**
   * Why a website may chinging input field for login? I don't know
   * @param {HTMLInputElement} input
   * @param {HTMLInputElement} oldInput
   */
  const onLoginChanged = function (input, oldInput) {
    oldInput.removeEventListener('input', loginInput);
    onLoginDetected(input);
  };

  let lastLogin = null;
  /**
   * Detecting login by input[type="password"]
   * If a form contains 1~3 password inputs
   * we consider the last text input before first password input username
   */
  const detectLogin = function () {
    const forms = document.forms;
    const logins = Array.from(forms).map(form => {
      const elements = form.elements;
      let lastText = null;
      let lastTextLike = null;
      let lastPassword = null;
      let passwordCount = null;
      let username = null;
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (element.type === 'password') {
          passwordCount++;
          if (passwordCount > 3) return null;
          if (!lastPassword) {
            lastPassword = element;
            username = lastText || lastTextLike;
          }
        } else if (element.type === 'text') {
          lastText = element;
        } else if (element.type === 'email') {
          lastTextLike = element;
        } else if (element.type === 'tel') {
          lastTextLike = element;
        }
      }
      return username;
    });
    const login = logins.find(login => login) || null;
    if (login !== lastLogin) {
      if (!lastLogin) onLoginDetected(login);
      else if (!login) onLoginLost(lastLogin);
      else onLoginChanged(login, lastLogin);
    }
  };

  const observer = new MutationObserver(detectLogin);
  observer.observe(document.documentElement, {
    subtree: true,
    attributes: true,
  });
  detectLogin();

}());
