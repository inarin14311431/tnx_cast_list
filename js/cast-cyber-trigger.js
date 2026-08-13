(() => {
  if (window.matchMedia?.('(max-width: 600px)').matches) return;
  const run = () => {
    const content = document.querySelector('#cast-content');
    const cards = [...document.querySelectorAll('#cast-styles .cast-style-card-simple')];
    if (!content || content.hidden || !cards.length) return false;
    document.body.classList.add('cast-cyber-enter');
    const id = document.querySelector('.cast-header__public-id');
    if (id) {
      const scan = () => {
        id.classList.remove('cast-id-scan');
        void id.offsetWidth;
        id.classList.add('cast-id-scan');
      };
      setTimeout(scan, 350);
      setInterval(scan, 5600);
    }
    return true;
  };
  [0, 250, 700, 1400, 2400].forEach(delay => setTimeout(run, delay));
})();
