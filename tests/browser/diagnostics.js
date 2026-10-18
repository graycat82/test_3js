// Injected by the local QA server only; absent from dist and GitHub Pages.
(() => {
  const qa = window.qa = { frames: 0, draws: 0, errors: [], hidden: false };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => raf(now => { qa.frames++; callback(now); });
  for (const name of ['drawElements', 'drawArrays']) {
    const draw = WebGL2RenderingContext.prototype[name];
    WebGL2RenderingContext.prototype[name] = function (...args) { qa.draws++; return draw.apply(this, args); };
  }
  window.addEventListener('error', event => qa.errors.push(event.message));
  window.addEventListener('unhandledrejection', event => qa.errors.push(String(event.reason)));
  const hidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
  qa.setHidden = value => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => value || hidden.get.call(document) });
    qa.hidden = value;
    document.dispatchEvent(new Event('visibilitychange'));
  };
  // Synthetic PointerEvents have no native pointer capture. Keep native capture for real input.
  for (const name of ['setPointerCapture', 'releasePointerCapture']) {
    const capture = Element.prototype[name];
    Element.prototype[name] = function (id) { try { capture.call(this, id); } catch (error) { if (error.name !== 'NotFoundError') throw error; } };
  }
  const failure = new URLSearchParams(location.search).get('failure');
  if (failure === 'webgl') {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type === 'webgl2' ? null : getContext.call(this, type, ...args); };
  }
  if (failure === 'texture') HTMLImageElement.prototype.decode = () => Promise.reject(new Error('QA image decode failure'));
})();
