import {authorize, code} from ''

const {user, tenant} = await authorize()

console.log(user, tenant)

const inputs = [
  document.querySelector('.stock-0-input'),
  document.querySelector('.stock-1-input'),
];

const viewers = [
  document.querySelector('.stock-0-view'),
  document.querySelector('.stock-1-view'),
]

async function fetchStocks() {
  const res = await fetch('/api/get', {
    headers: {
      code
    }
  });

  const stocks = await res.json()

  stocks.forEach((stock, i) => {
    inputs[i].value = stock;
    viewers[i].innerHTML = `<img src="/assets/${stock}.png">`
  })
}

async function updateStocks() {
  const res = await fetch('/api/set', {
    method: 'post',
    headers: {
      'content-type': 'application/json',
      code
    },
    body: JSON.stringify(inputs.map(input => input.value))
  });

  const stocks = await res.json()

  stocks.forEach((stock, i) => {
    viewers[i].innerHTML = `<img src="/assets/${stock}.png">`
  })
}

inputs.forEach(input => {
  input.addEventListener('change', () => {
    updateStocks();
  })
})


await fetchStocks();
