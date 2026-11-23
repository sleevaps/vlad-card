const stations = [
  'Здоровья', 'Своих рядом', 'Добрых вестей', 'Свободных вечеров',
  'Душевного покоя', 'Завтраков без спешки', 'Тёплых встреч',
  'Дорог к морю', 'Работы по душе', 'Домашнего тепла',
  'Поводов смеяться', 'Сбывшихся планов', 'Крепкого сна',
  'Времени на себя', 'Удачных поворотов', 'Сил на задуманное'
];

const qualities = ['тёплых', 'долгожданных', 'неожиданных', 'добрых', 'весёлых', 'хороших', 'запоминающихся', 'светлых', 'спокойных'];
const moments = ['встреч', 'вечеров', 'поездок', 'дней', 'разговоров', 'моментов', 'историй', 'выходных'];

export function wishAt(index) {
  if (index < stations.length) return stations[index];
  const count = index - stations.length;
  return qualities[(count * 5 + Math.floor(count / moments.length)) % qualities.length]
    + ' ' + moments[(count * 3) % moments.length];
}
