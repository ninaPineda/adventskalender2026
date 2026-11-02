// Match the calendar's Berlin time, including daylight saving time.
(() => {
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23',
  });
  function updateTheme() {
    const hour = Number(clock.format(new Date()));
    document.documentElement.dataset.theme = hour >= 20 || hour < 6 ? 'dark' : 'light';
  }
  updateTheme();
  // Recheck while open and immediately after returning to a suspended tab.
  setInterval(updateTheme, 1000);
  document.addEventListener('visibilitychange', updateTheme);
  window.addEventListener('focus', updateTheme);
})();
