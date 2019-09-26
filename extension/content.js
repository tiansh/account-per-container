; (function () {

  const getPreferedUsername = function () {
    return browser.runtime.sendMessage({ method: 'getPreferedUsername' });
  };

  const onUsernameChange = function (username) {
    browser.runtime.sendMessage({ method: 'onUsernameChange', params: [username] });
  };

  let oldValue = null;
  /**
   * @param {Event} event
   */
  const loginInput = function (event) {
    /** @type {HTMLInputElement} */
    const input = event.target;
    if (input.value === oldValue) return;
    oldValue = input.value;
    onUsernameChange(input.value);
  };

  /** @param {HTMLInputElement} input */
  const onLoginDetected = async function (input) {
    input.addEventListener('input', loginInput);
    onUsernameChange(input.value);
    if (!input.value) {
      const username = await getPreferedUsername();
      if (username) input.value = username;
      onUsernameChange(input.value);
    }
  };

  /** @param {HTMLInputElement} oldInput */
  const onLoginLost = function (oldInput) {
    oldInput.removeEventListener('input', loginInput);
  };

  /**
   * @param {HTMLInputElement} input
   * @param {HTMLInputElement} oldInput
   */
  const onLoginChanged = function (input, oldInput) {
    oldInput.removeEventListener('input', loginInput);
    onLoginDetected(input);
  };

  let lastLogin = null;
  const detectLogin = function () {
    const forms = document.forms;
    const logins = Array.from(forms).map(form => {
      const elements = form.elements;
      let lastText = null;
      let lastTextLike = null;
      let lastPassword = null;
      let username = null;
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (element.type === 'password') {
          if (lastPassword) return null;
          lastPassword = element;
          username = lastText || lastTextLike;
        } else if (element.type === 'text') {
          lastText = element;
        } else if (element.type === 'email') {
          lastTextLike = element;
        }
      }
      return username;
    });
    const login = logins.find(login => login);
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
    attributeFilter: ['type'],
  });
  detectLogin();

}());
