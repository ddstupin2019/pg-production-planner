const app = document.querySelector<HTMLElement>('#app');

if (app) {
  const heading = document.createElement('h1');
  heading.textContent = 'Учебная симуляция производства';
  const disclosure = document.createElement('p');
  disclosure.textContent =
    'Не производственная система. Интерфейс и расчётная модель пока не реализованы.';
  app.replaceChildren(heading, disclosure);
}
